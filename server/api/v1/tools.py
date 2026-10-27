from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
import urllib.parse
import httpx
import secrets
import string
import re

from server.core.database import get_db_connection
from server.core.security import get_real_client_ip
from server.api.deps import get_current_user, get_admin_user
from server.services.credit_service import (
    get_all_tool_pricing, update_tool_pricing, execute_tool_charge
)
from server.services.audit_service import record_admin_log

router = APIRouter()

RESERVED_ALIASES = {
    "api", "admin", "js", "models", "locales", "icons",
    "robots.txt", "sw.js", "manifest.json", "sitemap.xml",
    "s", "tools", "help", "static", "login", "register"
}

class ShortLinkCreatePayload(BaseModel):
    url: str
    alias: str = ""
    prefix: str = "/s/"

@router.post("/shortlink/create")
async def create_shortlink_proxy(payload: ShortLinkCreatePayload, request: Request):
    """
    短链接生成服务：
    1. 默认优先采用本平台原生自建短链 (极速 302 直达，无第三方广告、无倒计时预览中转页，完全保护隐私与体验)
    2. 若自定义别名被占用或格式不合规进行精确拦截提示
    3. 异常兜底降级至 is.gd (绝不使用带有倒计时中转页的废弃接口)
    """
    target_url = payload.url.strip()
    alias = payload.alias.strip()
    prefix = payload.prefix.strip() if payload.prefix else "/s/"
    if not prefix.startswith("/"):
        prefix = "/" + prefix
    if not prefix.endswith("/"):
        prefix = prefix + "/"

    parsed = urllib.parse.urlparse(target_url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise HTTPException(400, "请输入以 http:// 或 https:// 开头的合法完整网址")

    hostname = (parsed.hostname or "").lower()
    if hostname in ("localhost", "127.0.0.1", "0.0.0.0", "::1") or hostname.endswith(".local") or hostname.endswith(".internal"):
        raise HTTPException(400, "禁止创建指向本地或内部网络的短链接")

    if alias:
        if alias.lower() in RESERVED_ALIASES:
            raise HTTPException(400, "该别名属于系统保留字，请使用其他别名")
        if not re.match(r"^[a-zA-Z0-9_-]{3,30}$", alias):
            raise HTTPException(400, "自定义别名须为 3-30 位字母、数字、下划线或连字符(-)")

    # 1. 优先使用自建原生短链系统
    try:
        db = await get_db_connection()
        try:
            code = None
            if alias:
                cursor = await db.execute("SELECT id, original_url FROM short_links WHERE code = ?", (alias,))
                existing = await cursor.fetchone()
                if existing:
                    if existing["original_url"] == target_url:
                        code = alias
                    else:
                        raise HTTPException(400, "自定义别名已被占用，请更换其他后缀")
                else:
                    client_ip = get_real_client_ip(request)
                    await db.execute(
                        "INSERT INTO short_links (code, original_url, created_ip) VALUES (?, ?, ?)",
                        (alias, target_url, client_ip)
                    )
                    await db.commit()
                    code = alias
            else:
                # 检查是否已为相同长网址生成过短链（复用已有短链，避免膨胀）
                cursor = await db.execute("SELECT code FROM short_links WHERE original_url = ? ORDER BY id ASC LIMIT 1", (target_url,))
                existing = await cursor.fetchone()
                if existing:
                    code = existing["code"]
                else:
                    chars = string.ascii_letters + string.digits
                    for _ in range(5):
                        candidate = "".join(secrets.choice(chars) for _ in range(6))
                        c_check = await db.execute("SELECT id FROM short_links WHERE code = ?", (candidate,))
                        if not await c_check.fetchone():
                            code = candidate
                            break
                    if not code:
                        code = secrets.token_hex(4)

                    client_ip = get_real_client_ip(request)
                    await db.execute(
                        "INSERT INTO short_links (code, original_url, created_ip) VALUES (?, ?, ?)",
                        (code, target_url, client_ip)
                    )
                    await db.commit()

            proto = request.headers.get("x-forwarded-proto", request.url.scheme)
            host = request.headers.get("host", request.url.netloc)
            short_url = f"{proto}://{host}{prefix}{code}"
            return {"status": "ok", "short_url": short_url, "code": code, "service": "native"}
        finally:
            await db.close()
    except HTTPException:
        raise
    except Exception as db_err:
        print(f"[ShortLink Native Error] {db_err}")

    # 2. 数据库异常时的备用降级：尝试 is.gd
    try:
        is_gd_api = f"https://is.gd/create.php?format=json&url={urllib.parse.quote(target_url, safe='')}"
        if alias:
            is_gd_api += f"&shorturl={urllib.parse.quote(alias, safe='')}"

        async with httpx.AsyncClient(timeout=6.0, headers={"User-Agent": "Mozilla/5.0"}) as client:
            resp = await client.get(is_gd_api)
            if resp.status_code == 200:
                data = resp.json()
                if "shorturl" in data:
                    return {"status": "ok", "short_url": data["shorturl"], "service": "is.gd"}
                elif "errormessage" in data:
                    if alias and data.get("errorcode") == 2:
                        raise HTTPException(400, "自定义别名已被占用，请更换其他后缀")
                    raise HTTPException(400, f"短链服务提示: {data.get('errormessage')}")
    except HTTPException:
        raise
    except Exception as e:
        if alias:
            raise HTTPException(502, f"短链接服务请求失败: {str(e)}")

    raise HTTPException(502, "短链接生成服务暂时不可用，请稍后重试")

@router.get("/shortlink/resolve/{code}")
async def resolve_shortlink(code: str):
    """供前端 SPA 路由或 Nginx 兜底查询"""
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT id, original_url FROM short_links WHERE code = ?", (code,))
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(404, "短链接不存在或已失效")
        await db.execute("UPDATE short_links SET click_count = click_count + 1, updated_at = datetime('now') WHERE id = ?", (row["id"],))
        await db.commit()
        return {"status": "ok", "original_url": row["original_url"]}
    finally:
        await db.close()

class UpdatePricingPayload(BaseModel):
    display_name: str
    credits_per_use: int = Field(..., ge=0)
    daily_free_limit: int = Field(..., ge=0)
    free_tier_allowed: int = Field(1, ge=0, le=1)
    is_enabled: int = Field(1, ge=0, le=1)

@router.get("/pricing")
async def get_pricing_list():
    """公开接口：获取所有工具扣费单价与免费额度"""
    return await get_all_tool_pricing()

@router.post("/{tool_key}/use")
async def use_tool_endpoint(
    tool_key: str,
    user = Depends(get_current_user)
):
    """
    核心扣费接口：双层 CAS 扣除 (免费额度 -> 账户点数)
    支持 200 (扣费/免费成功)、402 (余额不足)、503 (并发锁忙退避)
    """
    return await execute_tool_charge(tool_key, user["id"])

@router.put("/admin/{tool_key}/pricing")
async def admin_update_tool_pricing(
    tool_key: str,
    payload: UpdatePricingPayload,
    request: Request,
    admin = Depends(get_admin_user)
):
    """管理员更新工具定价与限额"""
    await update_tool_pricing(
        tool_key=tool_key,
        display_name=payload.display_name,
        credits_per_use=payload.credits_per_use,
        daily_free_limit=payload.daily_free_limit,
        free_tier_allowed=payload.free_tier_allowed,
        is_enabled=payload.is_enabled
    )
    client_ip = get_real_client_ip(request)
    await record_admin_log(
        admin_id=admin["id"],
        action="update",
        target="pricing",
        detail={"tool_key": tool_key, **payload.model_dump()},
        ip_address=client_ip
    )
    return {"status": "ok", "tool_key": tool_key}
