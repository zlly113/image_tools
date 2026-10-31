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
    raise HTTPException(status_code=410, detail="短链接服务已根据安全合规要求下线")

@router.get("/shortlink/resolve/{code}")
async def resolve_shortlink(code: str):
    raise HTTPException(status_code=410, detail="短链接服务已安全下线")

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
