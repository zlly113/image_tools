from fastapi import APIRouter, Request, Response, Depends, HTTPException, status, Header
from pydantic import BaseModel, EmailStr, Field
import jwt
from server.core.config import settings
from server.core.security import verify_password, create_access_token, generate_refresh_token, get_real_client_ip
from server.core.rate_limiter import login_rate_limiter
from server.services.user_service import (
    get_user_by_email, get_user_by_username, create_user,
    save_refresh_token, verify_and_get_refresh_token, revoke_user_refresh_tokens,
    get_refresh_token_record_any, revoke_single_refresh_token,
    count_superadmins
)
from server.api.deps import get_current_user
import hashlib

router = APIRouter()

class RegisterPayload(BaseModel):
    username: str = Field(..., min_length=2, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=64)

class LoginPayload(BaseModel):
    email: EmailStr
    password: str

class SetupAdminPayload(BaseModel):
    username: str = Field(..., min_length=2, max_length=32)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=64)
    setup_token: str | None = None

def get_client_ip(request: Request) -> str:
    return get_real_client_ip(request)

@router.post("/register")
async def register(payload: RegisterPayload, request: Request):
    """用户注册：默认赠送 50 点，内置 IP 频控与并发冲突保护"""
    client_ip = get_client_ip(request)
    limit_key = f"register:{client_ip}"

    if login_rate_limiter.is_locked(limit_key):
        raise HTTPException(429, "注册过于频繁，该 IP 已被临时锁定 15 分钟，请稍后再试")

    if await get_user_by_email(payload.email):
        raise HTTPException(409, "该邮箱已被注册")
    if await get_user_by_username(payload.username):
        raise HTTPException(409, "该用户名已被使用")

    try:
        user = await create_user(
            username=payload.username,
            email=payload.email,
            password_raw=payload.password,
            role='user',
            initial_credits=settings.REGISTER_BONUS_CREDITS
        )
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) or "IntegrityError" in type(e).__name__:
            raise HTTPException(409, "该邮箱或用户名已被注册")
        raise

    return {
        "status": "ok",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "credit_balance": user["credit_balance"]
        }
    }

@router.post("/login")
async def login(payload: LoginPayload, request: Request, response: Response):
    """用户登录：签发 short access_token (2h) + long httpOnly refresh_token (30d)"""
    client_ip = get_client_ip(request)
    limit_key = f"login:{client_ip}:{payload.email.lower()}"

    if login_rate_limiter.is_locked(limit_key):
        raise HTTPException(429, "登录尝试过于频繁，账号已临时锁定 15 分钟，请稍后再试")

    user = await get_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user["password_hash"]):
        login_rate_limiter.record_failure(limit_key)
        raise HTTPException(401, "邮箱或密码错误")

    if not user["is_active"]:
        raise HTTPException(401, "该账号已被禁用，请联系管理员")

    login_rate_limiter.reset(limit_key)

    access_token = create_access_token(user["id"], user["role"])
    raw_refresh, refresh_hash, exp_date = generate_refresh_token()
    await save_refresh_token(user["id"], refresh_hash, exp_date.strftime("%Y-%m-%d %H:%M:%S"))

    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=True if request.url.scheme == "https" else False,
        path="/"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "avatar": user.get("avatar", ""),
            "role": user["role"],
            "credit_balance": user["credit_balance"]
        }
    }

@router.post("/refresh")
async def refresh_token_endpoint(request: Request, response: Response):
    """
    通过 HttpOnly Cookie 中的 refresh_token 静默换取新的 access_token 并实施 Token Rotation
    """
    raw_token = request.cookies.get("refresh_token")
    if not raw_token:
        raise HTTPException(401, "缺少刷新凭据")

    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    rt_record = await verify_and_get_refresh_token(token_hash)
    is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"

    if not rt_record:
        # 重放攻击检测：若此 token 存在历史记录但已被吊销/过期，作废该用户所有会话以防盗用
        any_record = await get_refresh_token_record_any(token_hash)
        if any_record:
            await revoke_user_refresh_tokens(any_record["user_id"])
        response.delete_cookie(key="refresh_token", path="/", samesite="lax", secure=is_secure)
        raise HTTPException(401, "刷新凭据无效或已失效")

    if not rt_record["is_active"]:
        response.delete_cookie(key="refresh_token", path="/", samesite="lax", secure=is_secure)
        raise HTTPException(401, "该账号已被禁用")

    # 实施 Token Rotation：作废旧 Refresh Token
    await revoke_single_refresh_token(token_hash)

    # 签发新的 Access Token 和新的 Refresh Token
    new_access_token = create_access_token(rt_record["user_id"], rt_record["role"])
    new_raw_refresh, new_refresh_hash, exp_date = generate_refresh_token()
    await save_refresh_token(rt_record["user_id"], new_refresh_hash, exp_date.strftime("%Y-%m-%d %H:%M:%S"))

    response.set_cookie(
        key="refresh_token",
        value=new_raw_refresh,
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        samesite="lax",
        secure=is_secure,
        path="/"
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    request: Request,
    authorization: str | None = Header(None, alias="Authorization")
):
    """
    用户登出：
    1. 即使 access token 已过期，依然能根据 refresh_token Cookie 找到并吊销用户会话；
    2. 严格在返回的 Response 实例中执行 delete_cookie，确保 Set-Cookie 清除头下发给浏览器。
    """
    is_secure = request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https"

    user_id = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id = int(payload.get("sub"))
        except Exception:
            pass

    raw_refresh = request.cookies.get("refresh_token")
    if not user_id and raw_refresh:
        token_hash = hashlib.sha256(raw_refresh.encode('utf-8')).hexdigest()
        rt_record = await get_refresh_token_record_any(token_hash)
        if rt_record:
            user_id = rt_record["user_id"]

    if user_id:
        await revoke_user_refresh_tokens(user_id)
    elif raw_refresh:
        token_hash = hashlib.sha256(raw_refresh.encode('utf-8')).hexdigest()
        await revoke_single_refresh_token(token_hash)

    res = Response(status_code=status.HTTP_204_NO_CONTENT)
    res.delete_cookie(key="refresh_token", path="/", samesite="lax", secure=is_secure)
    return res

@router.get("/me")
async def get_me(user = Depends(get_current_user)):
    """获取当前登录用户信息"""
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "avatar": user.get("avatar", ""),
        "role": user["role"],
        "credit_balance": user["credit_balance"],
        "is_active": user["is_active"]
    }

@router.post("/setup-admin")
async def setup_first_admin(
    payload: SetupAdminPayload,
    request: Request,
    x_setup_token: str | None = Header(None, alias="X-Setup-Token")
):
    """
    首次超级管理员引导接口：
    1. 系统必须尚未存在任何 superadmin；
    2. 必须在环境变量中配置 SETUP_ADMIN_TOKEN 并在此处核验，若未配置则强制禁用该 HTTP 接口（推荐使用本地 CLI: python3 create_admin.py）；
    3. 邮箱必须与环境变量 FIRST_ADMIN_EMAIL 严格匹配；
    4. 内置 IP 频控。
    """
    client_ip = get_client_ip(request)
    limit_key = f"setup_admin:{client_ip}"

    if login_rate_limiter.is_locked(limit_key):
        raise HTTPException(429, "操作过于频繁，该 IP 已被临时锁定 15 分钟，请稍后再试")

    if await count_superadmins() > 0:
        raise HTTPException(403, "超级管理员已初始化，此接口已永久关闭")

    if not settings.SETUP_ADMIN_TOKEN or not settings.SETUP_ADMIN_TOKEN.strip():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HTTP 首次管理员初始化接口未启用。请直接在服务器终端运行 'python3 create_admin.py <邮箱> <密码> [用户名]' 完成初始化，或在环境变量中配置强随机 SETUP_ADMIN_TOKEN 后重试。"
        )

    provided_token = payload.setup_token or x_setup_token
    if not provided_token or provided_token.strip() != settings.SETUP_ADMIN_TOKEN.strip():
        login_rate_limiter.record_failure(limit_key)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="初始化令牌 (setup_token) 校验失败")

    if payload.email.strip().lower() != settings.FIRST_ADMIN_EMAIL.strip().lower():
        login_rate_limiter.record_failure(limit_key)
        raise HTTPException(403, "提供的邮箱与预设的超级管理员邮箱不匹配")

    login_rate_limiter.reset(limit_key)
    try:
        user = await create_user(
            username=payload.username,
            email=payload.email,
            password_raw=payload.password,
            role='superadmin',
            initial_credits=9999
        )
    except Exception as e:
        if "UNIQUE constraint failed" in str(e) or "IntegrityError" in type(e).__name__:
            raise HTTPException(409, "该管理员邮箱或用户名已被占用，无法初始化")
        raise

    return {"status": "ok", "message": "超级管理员创建成功！", "admin_id": user["id"]}
