import json
from typing import Optional, Dict, Any
from server.core.database import get_db_connection

async def record_admin_log(
    admin_id: int,
    action: str,
    target: str,
    target_id: Optional[int] = None,
    detail: Optional[Dict[str, Any]] = None,
    ip_address: str = ""
):
    """
    统一管理员操作审计日志记录器：
    记录管理员创建/修改/删除/切换状态等关键运维操作
    """
    db = await get_db_connection()
    try:
        log_admin_id = admin_id if (admin_id and admin_id > 0) else None
        detail_json = json.dumps(detail or {}, ensure_ascii=False)
        await db.execute(
            """INSERT INTO admin_logs (admin_id, action, target, target_id, detail, ip_address)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (log_admin_id, action, target, target_id, detail_json, ip_address)
        )
        await db.commit()
    except Exception as e:
        print(f"[AuditLog] Failed to record admin log: {e}")
    finally:
        await db.close()
