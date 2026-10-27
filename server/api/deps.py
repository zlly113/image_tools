from fastapi import Header, HTTPException, status, Depends, Request
import jwt
from server.core.config import settings, INSECURE_DEFAULT_ADMIN_TOKENS
from server.core.security import get_real_client_ip
from server.core.rate_limiter import admin_token_rate_limiter
from server.services.user_service import get_user_by_id

def _get_client_ip(request: Request) -> str:
    return get_real_client_ip(request)

def _extract_admin_token(x_admin_token: str = None, authorization: str = None) -> str | None:
    token = x_admin_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
    return token.strip() if token else None

async def get_current_user(
    authorization: str = Header(None, alias="Authorization")
):
    """从 Authorization: Bearer <access_token> 解析当前登录用户"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证令牌",
            headers={"WWW-Authenticate": "Bearer"}
        )
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (jwt.PyJWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="令牌无效或已过期",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = await get_user_by_id(user_id)
    if not user or not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户不存在或已被禁用"
        )
    return user

async def get_admin_user(
    request: Request,
    x_admin_token: str = Header(None, alias="X-Admin-Token"),
    authorization: str = Header(None, alias="Authorization")
):
    """
    统一管理员依赖注入：
    1. 防暴力破解与频控拦截 (连续 5 次认证失败锁定该 IP 15 分钟)
    2. 优先校验静态 ADMIN_TOKEN (Header: X-Admin-Token 或 Authorization: Bearer <token>)
    3. 校验 JWT 登录态中的 admin / superadmin 角色
    """
    client_ip = _get_client_ip(request)
    limit_key = f"admin_auth:{client_ip}"

    # 1. 检查是否已被频控锁定
    if admin_token_rate_limiter.is_locked(limit_key):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="管理员认证失败次数过多，该 IP 已被锁定 15 分钟，请稍后再试",
            headers={"Retry-After": "900"}
        )

    token = _extract_admin_token(x_admin_token, authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少管理员认证令牌",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # 2. 静态 ADMIN_TOKEN 匹配 (需显式开启，且生产环境下不接受不安全默认值)
    if settings.ENABLE_STATIC_ADMIN_TOKEN and settings.ADMIN_TOKEN and token == settings.ADMIN_TOKEN:
        if settings.is_production and settings.ADMIN_TOKEN in INSECURE_DEFAULT_ADMIN_TOKENS:
            pass  # 生产环境拦截默认测试静态 Token
        else:
            admin_token_rate_limiter.reset(limit_key)
            return {
                "id": 0,
                "username": "root_admin",
                "email": settings.FIRST_ADMIN_EMAIL,
                "role": "superadmin",
                "credit_balance": 99999,
                "is_active": 1
            }

    # 3. JWT 登录态解析与数据库严格校验
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        user = await get_user_by_id(user_id)
        if user and user["is_active"] and user["role"] in ("admin", "superadmin"):
            admin_token_rate_limiter.reset(limit_key)
            return user
    except Exception:
        pass

    # 认证失败，累加失败记录
    admin_token_rate_limiter.record_failure(limit_key)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="未授权或 Token 已失效，请重新登录",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_admin_token(
    request: Request,
    x_admin_token: str = Header(None, alias="X-Admin-Token"),
    authorization: str = Header(None, alias="Authorization")
):
    """
    Phase 1 兼容中间件：委托 get_admin_user 进行强校验，确保查库验证管理员角色与活跃状态
    """
    await get_admin_user(request=request, x_admin_token=x_admin_token, authorization=authorization)
    return True

