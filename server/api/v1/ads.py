from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from server.api.deps import get_admin_user, verify_admin_token
from server.services.ads_service import AdsService
from server.services.audit_service import record_admin_log
from server.models.schemas import AdCreate, AdUpdate
from server.core.security import get_real_client_ip

router = APIRouter()

def get_client_ip(request: Request) -> str:
    return get_real_client_ip(request)

# --- 前台公开接口 ---

@router.get("", response_model=List[Dict[str, Any]])
async def get_active_ads(slot_id: Optional[str] = Query(None, description="广告位标识，如 top-banner, sidebar-ad")):
    """获取所有当前有效且处于排期内的广告"""
    return await AdsService.get_active_ads(slot_id=slot_id)

@router.post("/{ad_id}/click")
async def record_ad_click(ad_id: int):
    """记录广告点击次数"""
    await AdsService.record_click(ad_id)
    return {"status": "ok"}

@router.post("/{ad_id}/close")
async def record_ad_close(ad_id: int):
    """记录广告关闭次数"""
    await AdsService.record_close(ad_id)
    return {"status": "ok"}

# --- 后台管理接口 ---

@router.get("/admin/all", response_model=List[Dict[str, Any]], dependencies=[Depends(verify_admin_token)])
async def get_all_ads_for_admin(slot_id: Optional[str] = Query(None)):
    """获取所有广告（包含已下线或未激活）"""
    return await AdsService.get_all_ads(slot_id=slot_id)

@router.post("")
async def create_ad(data: AdCreate, request: Request, admin = Depends(get_admin_user)):
    """创建新广告"""
    new_id = await AdsService.create_ad(data)
    await record_admin_log(
        admin_id=admin["id"],
        action="create",
        target="ad",
        target_id=new_id,
        detail=data.model_dump(),
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "id": new_id, "message": "Ad created successfully"}

@router.put("/{ad_id}")
async def update_ad(ad_id: int, data: AdUpdate, request: Request, admin = Depends(get_admin_user)):
    """更新广告信息"""
    success = await AdsService.update_ad(ad_id, data)
    if not success:
        raise HTTPException(status_code=404, detail="Ad not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="update",
        target="ad",
        target_id=ad_id,
        detail=data.model_dump(exclude_unset=True),
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "message": "Ad updated successfully"}

@router.delete("/{ad_id}")
async def delete_ad(ad_id: int, request: Request, admin = Depends(get_admin_user)):
    """删除广告"""
    success = await AdsService.delete_ad(ad_id)
    if not success:
        raise HTTPException(status_code=404, detail="Ad not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="delete",
        target="ad",
        target_id=ad_id,
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "message": "Ad deleted successfully"}

@router.patch("/{ad_id}/toggle")
async def toggle_ad_status(ad_id: int, request: Request, admin = Depends(get_admin_user)):
    """切换广告上下线状态"""
    new_state = await AdsService.toggle_ad(ad_id)
    if new_state is None:
        raise HTTPException(status_code=404, detail="Ad not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="toggle",
        target="ad",
        target_id=ad_id,
        detail={"is_active": new_state},
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "is_active": new_state}
