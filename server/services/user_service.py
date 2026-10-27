import aiosqlite
from typing import Optional, Dict, Any, List
from server.core.database import get_db_connection
from server.core.security import hash_password

async def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE email = ?", (email.strip().lower(),))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username.strip(),))
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def create_user(username: str, email: str, password_raw: str, role: str = 'user', initial_credits: int = 50) -> Dict[str, Any]:
    """创建新用户并原子写入初始赠送流水"""
    pwd_hash = hash_password(password_raw)
    db = await get_db_connection()
    try:
        await db.execute("BEGIN IMMEDIATE")
        cursor = await db.execute(
            """INSERT INTO users (username, email, password_hash, role, credit_balance)
               VALUES (?, ?, ?, ?, ?)""",
            (username.strip(), email.strip().lower(), pwd_hash, role, initial_credits)
        )
        user_id = cursor.lastrowid

        if initial_credits > 0:
            await db.execute(
                """INSERT INTO credit_transactions (user_id, amount, type, balance_after, ref_type, description)
                   VALUES (?, ?, 'recharge', ?, 'register_bonus', '新用户注册赠送点数')""",
                (user_id, initial_credits, initial_credits)
            )

        await db.execute("COMMIT")
        
        cur = await db.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        new_user = dict(await cur.fetchone())
        return new_user
    except Exception:
        try:
            await db.rollback()
        except Exception:
            pass
        raise
    finally:
        await db.close()

async def save_refresh_token(user_id: int, token_hash: str, expires_at_str: str):
    db = await get_db_connection()
    try:
        await db.execute(
            """INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
               VALUES (?, ?, ?)""",
            (user_id, token_hash, expires_at_str)
        )
    finally:
        await db.close()

async def verify_and_get_refresh_token(token_hash: str) -> Optional[Dict[str, Any]]:
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            """SELECT rt.*, u.is_active, u.role 
               FROM refresh_tokens rt
               JOIN users u ON rt.user_id = u.id
               WHERE rt.token_hash = ? AND rt.is_revoked = 0 AND rt.expires_at > datetime('now')""",
            (token_hash,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def get_refresh_token_record_any(token_hash: str) -> Optional[Dict[str, Any]]:
    """查询 refresh token 记录（包括已吊销或过期的，用于检测重放攻击）"""
    db = await get_db_connection()
    try:
        cursor = await db.execute(
            """SELECT rt.*, u.is_active, u.role 
               FROM refresh_tokens rt
               JOIN users u ON rt.user_id = u.id
               WHERE rt.token_hash = ?""",
            (token_hash,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None
    finally:
        await db.close()

async def revoke_single_refresh_token(token_hash: str):
    """吊销单个特定的 Refresh Token (用于轮换时作废旧 Token)"""
    db = await get_db_connection()
    try:
        await db.execute(
            "UPDATE refresh_tokens SET is_revoked = 1 WHERE token_hash = ?",
            (token_hash,)
        )
    finally:
        await db.close()

async def revoke_user_refresh_tokens(user_id: int):
    """吊销用户所有未过期的 Refresh Token"""
    db = await get_db_connection()
    try:
        await db.execute(
            """UPDATE refresh_tokens 
               SET is_revoked = 1 
               WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')""",
            (user_id,)
        )
    finally:
        await db.close()

async def get_users_list(page: int = 1, limit: int = 20, search: str = "") -> Dict[str, Any]:
    offset = (page - 1) * limit
    db = await get_db_connection()
    try:
        if search:
            s = f"%{search.strip()}%"
            count_cur = await db.execute("SELECT COUNT(*) FROM users WHERE email LIKE ? OR username LIKE ?", (s, s))
            total = (await count_cur.fetchone())[0]
            cur = await db.execute(
                """SELECT id, username, email, avatar, role, is_active, credit_balance, last_login_at, created_at
                   FROM users WHERE email LIKE ? OR username LIKE ?
                   ORDER BY id DESC LIMIT ? OFFSET ?""",
                (s, s, limit, offset)
            )
        else:
            count_cur = await db.execute("SELECT COUNT(*) FROM users")
            total = (await count_cur.fetchone())[0]
            cur = await db.execute(
                """SELECT id, username, email, avatar, role, is_active, credit_balance, last_login_at, created_at
                   FROM users ORDER BY id DESC LIMIT ? OFFSET ?""",
                (limit, offset)
            )
        rows = [dict(r) for r in await cur.fetchall()]
        return {"total": total, "items": rows, "page": page, "limit": limit}
    finally:
        await db.close()

async def set_user_status(user_id: int, is_active: int):
    db = await get_db_connection()
    try:
        await db.execute("UPDATE users SET is_active = ? WHERE id = ?", (is_active, user_id))
        if is_active == 0:
            await db.execute(
                "UPDATE refresh_tokens SET is_revoked = 1 WHERE user_id = ? AND is_revoked = 0",
                (user_id,)
            )
    finally:
        await db.close()

async def count_superadmins() -> int:
    db = await get_db_connection()
    try:
        cur = await db.execute("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")
        return (await cur.fetchone())[0]
    finally:
        await db.close()
