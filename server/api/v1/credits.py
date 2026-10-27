from fastapi import APIRouter, Request, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from server.api.deps import get_current_user, get_admin_user
from server.services.credit_service import get_user_transactions, admin_recharge_user
from server.services.user_service import get_user_by_id
from server.core.security import get_real_client_ip

router = APIRouter()

class RechargePayload(BaseModel):
    user_id: int
    amount: int = Field(..., ge=-100000, le=1000000, description="正数充值/赠送，负数扣减")
    remark: str = Field(..., min_length=2, max_length=128)

def get_client_ip(request: Request) -> str:
    return get_real_client_ip(request)

@router.get("/balance")
async def get_my_balance(user = Depends(get_current_user)):
    """查询当前登录用户点数余额"""
    fresh_user = await get_user_by_id(user["id"])
    return {"balance": fresh_user["credit_balance"] if fresh_user else 0}

@router.get("/transactions")
async def get_my_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    user = Depends(get_current_user)
):
    """分页查询用户交易流水"""
    return await get_user_transactions(user["id"], page=page, limit=limit)

@router.post("/recharge")
async def admin_recharge(
    payload: RechargePayload,
    request: Request,
    admin = Depends(get_admin_user)
):
    """管理员手动充值/冲正"""
    if payload.amount == 0:
        raise HTTPException(400, "调账金额不能为 0")

    client_ip = get_client_ip(request)
    result = await admin_recharge_user(
        admin_id=admin["id"],
        user_id=payload.user_id,
        amount=payload.amount,
        remark=payload.remark,
        client_ip=client_ip
    )
    return {"status": "ok", "data": result}
