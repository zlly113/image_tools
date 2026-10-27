from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from server.api.deps import get_admin_user
from server.services.user_service import get_users_list, get_user_by_id, set_user_status
from server.services.credit_service import get_user_transactions
from server.services.audit_service import record_admin_log
from server.core.security import get_real_client_ip

router = APIRouter()

class UserStatusPayload(BaseModel):
    is_active: int = Field(..., ge=0, le=1)

@router.get("")
async def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=64),
    admin = Depends(get_admin_user)
):
    """管理员分页查询用户列表"""
    return await get_users_list(page=page, limit=limit, search=search)

@router.get("/{user_id}")
async def get_user_detail(
    user_id: int,
    admin = Depends(get_admin_user)
):
    """管理员查看用户详情"""
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(404, "用户不存在")
    txs = await get_user_transactions(user_id, page=1, limit=20)
    user_data = dict(user)
    user_data.pop("password_hash", None)
    return {
        "user": user_data,
        "recent_transactions": txs["items"]
    }

@router.patch("/{user_id}/status")
async def update_user_status(
    user_id: int,
    payload: UserStatusPayload,
    request: Request,
    admin = Depends(get_admin_user)
):
    """管理员启用/禁用用户（禁用时批量吊销 Refresh Token）"""
    await set_user_status(user_id, payload.is_active)
    client_ip = get_real_client_ip(request)
    await record_admin_log(
        admin_id=admin["id"],
        action="toggle",
        target="user",
        target_id=user_id,
        detail={"is_active": payload.is_active},
        ip_address=client_ip
    )
    return {"status": "ok", "user_id": user_id, "is_active": payload.is_active}
