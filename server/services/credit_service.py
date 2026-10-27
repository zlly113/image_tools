import sqlite3
import json
from datetime import date, datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException
from server.core.database import get_db_connection

BEIJING_TZ = timezone(timedelta(hours=8))

def get_today_beijing_str() -> str:
    """获取东八区(UTC+8)当前日期字符串，与数据库 date('now', '+8 hours') 严格对齐"""
    return datetime.now(BEIJING_TZ).strftime("%Y-%m-%d")

async def safe_rollback(db):
    """v0.3 修正：BEGIN 本身失败时无活动事务，裸 ROLLBACK 会抛 'cannot rollback'"""
    try:
        await db.rollback()
    except Exception:
        pass

async def get_tool_pricing(tool_key: str) -> Optional[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT * FROM tool_pricing WHERE tool_key = ?", (tool_key,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def get_all_tool_pricing() -> List[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT * FROM tool_pricing ORDER BY id ASC")
        return [dict(r) for r in await cursor.fetchall()]
    finally:
        await db.close()

async def update_tool_pricing(tool_key: str, display_name: str, credits_per_use: int, daily_free_limit: int, free_tier_allowed: int, is_enabled: int):
    db = await get_db_connection()
    try:
        await db.execute(
            """UPDATE tool_pricing 
               SET display_name = ?, credits_per_use = ?, daily_free_limit = ?, free_tier_allowed = ?, is_enabled = ?
               WHERE tool_key = ?""",
            (display_name, credits_per_use, daily_free_limit, free_tier_allowed, is_enabled, tool_key)
        )
    finally:
        await db.close()

async def execute_tool_charge(tool_key: str, user_id: int) -> Dict[str, Any]:
    """
    核心双层 CAS 扣费逻辑 (对齐 v0.3 规范)
    D1: 双层 CAS (免费额度 Upsert CAS + 付费余额条件更新)
    D2: balance_after 必须在 UPDATE 成功后重新 SELECT 真实值
    D3: daily_free_limit <= 0 直接跳过免费层 (0 = 无免费额度)
    D4: isolation_level=None 手工控制 BEGIN IMMEDIATE 立即获取写锁
    D5: 锁超时返回 503 + Retry-After
    """
    pricing = await get_tool_pricing(tool_key)
    if not pricing or not pricing["is_enabled"]:
        raise HTTPException(404, "工具不存在或已被停用")

    today = get_today_beijing_str()
    cost = pricing["credits_per_use"]
    daily_free_limit = pricing["daily_free_limit"]

    db = await get_db_connection()
    try:
        await db.execute("BEGIN IMMEDIATE")

        # ---- 第一层：每日免费额度 Upsert CAS ----
        if daily_free_limit > 0:
            cursor = await db.execute(
                """INSERT INTO daily_usage (user_id, tool_key, use_date, use_count) 
                   VALUES (?, ?, ?, 1)
                   ON CONFLICT(user_id, tool_key, use_date) 
                   DO UPDATE SET use_count = use_count + 1 
                   WHERE use_count < ?""",
                (user_id, tool_key, today, daily_free_limit)
            )
            if cursor.rowcount == 1:
                # 免费额度内成功（含首次建行或条件更新成功）
                cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
                current_bal = (await cur.fetchone())[0]

                await db.execute(
                    """INSERT INTO credit_transactions (user_id, amount, type, balance_after, ref_type, description)
                       VALUES (?, 0, 'free_use', ?, ?, ?)""",
                    (user_id, current_bal, f"tool:{tool_key}", f"免费使用 {pricing['display_name']}")
                )
                await db.execute("COMMIT")

                cur_usage = await db.execute(
                    "SELECT use_count FROM daily_usage WHERE user_id=? AND tool_key=? AND use_date=?",
                    (user_id, tool_key, today)
                )
                used_count = (await cur_usage.fetchone())[0]
                return {
                    "status": "free",
                    "remaining_free": max(0, daily_free_limit - used_count),
                    "balance": current_bal,
                }

        # ---- 第二层：若工具设置为免费 (cost <= 0)，直接返回 free 状态，不写扣费流水 ----
        if cost <= 0:
            cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
            current_bal = (await cur.fetchone())[0]
            await db.execute("COMMIT")
            return {
                "status": "free",
                "remaining_free": 0,
                "balance": current_bal,
            }

        # ---- 付费余额 CAS 扣减 ----
        result = await db.execute(
            """UPDATE users 
               SET credit_balance = credit_balance - ?
               WHERE id = ? AND credit_balance >= ?""",
            (cost, user_id, cost)
        )
        if result.rowcount == 0:
            await db.execute("ROLLBACK")
            # 查出真实最新余额返回
            bal_cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
            current_real_bal = (await bal_cur.fetchone())[0]
            raise HTTPException(402, {
                "error": "INSUFFICIENT_CREDITS",
                "message": "点数不足，请充值",
                "required": cost,
                "balance": current_real_bal,
            })

        # D2 关键：CAS UPDATE 成功后，再 SELECT 取真实新值
        cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
        real_balance = (await cur.fetchone())[0]

        await db.execute(
            """INSERT INTO credit_transactions (user_id, amount, type, balance_after, ref_type, description)
               VALUES (?, ?, 'deduct', ?, ?, ?)""",
            (user_id, -cost, real_balance, f"tool:{tool_key}", f"使用 {pricing['display_name']}")
        )
        await db.execute("COMMIT")
        return {
            "status": "charged",
            "credits_used": cost,
            "balance": real_balance
        }

    except sqlite3.OperationalError as e:
        await safe_rollback(db)
        if "locked" in str(e).lower() or "busy" in str(e).lower():
            raise HTTPException(
                status_code=503,
                detail={"error": "SYSTEM_BUSY", "message": "系统繁忙，请稍后重试"},
                headers={"Retry-After": "1"}
            )
        raise
    except HTTPException:
        raise
    except Exception:
        await safe_rollback(db)
        raise
    finally:
        await db.close()

async def admin_recharge_user(admin_id: int, user_id: int, amount: int, remark: str, client_ip: str) -> Dict[str, Any]:
    """管理员手动调账/充值"""
    db = await get_db_connection()
    try:
        await db.execute("BEGIN IMMEDIATE")
        user_cur = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_row = await user_cur.fetchone()
        if not user_row:
            raise HTTPException(404, "目标用户不存在")

        # 更新余额，必须确保 credit_balance + amount >= 0，严禁余额打成负数
        cursor = await db.execute(
            "UPDATE users SET credit_balance = credit_balance + ? WHERE id = ? AND (credit_balance + ?) >= 0",
            (amount, user_id, amount)
        )
        if cursor.rowcount == 0:
            raise HTTPException(400, "扣减失败：用户当前余额不足以扣减该点数（禁止导致负数余额）")

        bal_cur = await db.execute("SELECT credit_balance FROM users WHERE id = ?", (user_id,))
        real_balance = (await bal_cur.fetchone())[0]

        # 写交易流水
        tx_type = 'recharge' if amount >= 0 else 'admin_deduct'
        await db.execute(
            """INSERT INTO credit_transactions (user_id, amount, type, balance_after, ref_type, description)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (user_id, amount, tx_type, real_balance, f"admin:{admin_id}", f"管理员调整: {remark}")
        )

        # 写管理员审计日志 (如果 admin_id 为 0 则置 None 避免触发外键限制)
        log_admin_id = admin_id if admin_id > 0 else None
        await db.execute(
            """INSERT INTO admin_logs (admin_id, action, target, target_id, detail, ip_address)
               VALUES (?, 'adjust', 'credits', ?, ?, ?)""",
            (log_admin_id, user_id, json.dumps({"amount": amount, "remark": remark, "balance_after": real_balance}), client_ip)
        )

        await db.execute("COMMIT")
        return {"user_id": user_id, "amount": amount, "balance": real_balance}
    except Exception:
        await safe_rollback(db)
        raise
    finally:
        await db.close()

async def get_user_transactions(user_id: int, page: int = 1, limit: int = 50) -> Dict[str, Any]:
    offset = (page - 1) * limit
    db = await get_db_connection()
    try:
        count_cur = await db.execute("SELECT COUNT(*) FROM credit_transactions WHERE user_id = ?", (user_id,))
        total = (await count_cur.fetchone())[0]
        cur = await db.execute(
            """SELECT id, amount, type, balance_after, ref_type, description, created_at
               FROM credit_transactions
               WHERE user_id = ?
               ORDER BY id DESC LIMIT ? OFFSET ?""",
            (user_id, limit, offset)
        )
        items = [dict(r) for r in await cur.fetchall()]
        return {"total": total, "items": items, "page": page, "limit": limit}
    finally:
        await db.close()
