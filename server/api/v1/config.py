from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request
from server.api.deps import get_admin_user, verify_admin_token
from server.services.config_service import ConfigService
from server.services.audit_service import record_admin_log
from server.models.schemas import PublicSiteConfig, SiteConfigUpdate
from server.core.security import get_real_client_ip

router = APIRouter()

def get_client_ip(request: Request) -> str:
    return get_real_client_ip(request)

@router.get("", response_model=PublicSiteConfig)
async def get_public_config():
    """获取公开站点配置 (前台调用，带缓存/降级支持)"""
    return await ConfigService.get_public_config()

@router.get("/raw", response_model=List[Dict[str, Any]], dependencies=[Depends(verify_admin_token)])
async def get_all_raw_configs():
    """获取所有配置原始键值对 (后台管理专用)"""
    return await ConfigService.get_all_raw_configs()

@router.put("")
async def update_site_config(data: SiteConfigUpdate, request: Request, admin = Depends(get_admin_user)):
    """更新某项站点配置 (后台管理专用)"""
    success = await ConfigService.update_config(data.key, data.value, data.description)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update configuration")
    await record_admin_log(
        admin_id=admin["id"],
        action="update",
        target="config",
        detail={"key": data.key, "value": data.value, "description": data.description},
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "message": f"Config '{data.key}' updated successfully"}
