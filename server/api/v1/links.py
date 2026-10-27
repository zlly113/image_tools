from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from server.api.deps import get_admin_user, verify_admin_token
from server.services.links_service import LinksService
from server.services.audit_service import record_admin_log
from server.models.schemas import LinkCreate, LinkUpdate

router = APIRouter()

def get_client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

# --- 前台公开接口 ---

@router.get("", response_model=List[Dict[str, Any]])
async def get_active_links(category: Optional[str] = Query(None, description="分类：friend (友情链接) 或 tool (推荐工具)")):
    """获取所有激活的外链/推荐工具列表"""
    return await LinksService.get_active_links(category=category)

@router.post("/{link_id}/click")
async def record_link_click(link_id: int):
    """记录外链点击"""
    await LinksService.record_click(link_id)
    return {"status": "ok"}

# --- 后台管理接口 ---

@router.get("/admin/all", response_model=List[Dict[str, Any]], dependencies=[Depends(verify_admin_token)])
async def get_all_links_for_admin(category: Optional[str] = Query(None)):
    """获取全部外链（包含已隐藏）"""
    return await LinksService.get_all_links(category=category)

@router.post("")
async def create_link(data: LinkCreate, request: Request, admin = Depends(get_admin_user)):
    """创建新外链"""
    new_id = await LinksService.create_link(data)
    await record_admin_log(
        admin_id=admin["id"],
        action="create",
        target="link",
        target_id=new_id,
        detail=data.model_dump(),
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "id": new_id, "message": "Link created successfully"}

@router.put("/{link_id}")
async def update_link(link_id: int, data: LinkUpdate, request: Request, admin = Depends(get_admin_user)):
    """更新外链信息"""
    success = await LinksService.update_link(link_id, data)
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="update",
        target="link",
        target_id=link_id,
        detail=data.model_dump(exclude_unset=True),
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "message": "Link updated successfully"}

@router.delete("/{link_id}")
async def delete_link(link_id: int, request: Request, admin = Depends(get_admin_user)):
    """删除外链"""
    success = await LinksService.delete_link(link_id)
    if not success:
        raise HTTPException(status_code=404, detail="Link not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="delete",
        target="link",
        target_id=link_id,
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "message": "Link deleted successfully"}

@router.patch("/{link_id}/toggle")
async def toggle_link_status(link_id: int, request: Request, admin = Depends(get_admin_user)):
    """切换外链上下线状态"""
    new_state = await LinksService.toggle_link(link_id)
    if new_state is None:
        raise HTTPException(status_code=404, detail="Link not found")
    await record_admin_log(
        admin_id=admin["id"],
        action="toggle",
        target="link",
        target_id=link_id,
        detail={"is_active": new_state},
        ip_address=get_client_ip(request)
    )
    return {"status": "ok", "is_active": new_state}
