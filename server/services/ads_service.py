import json
from typing import List, Optional, Dict, Any
from server.core.database import get_db_connection
from server.models.schemas import AdCreate, AdUpdate, AdResponse

class AdsService:
    @staticmethod
    def _row_to_dict(row) -> Dict[str, Any]:
        d = dict(row)
        for json_col in ("title_i18n", "desc_i18n"):
            if json_col in d and isinstance(d[json_col], str):
                try:
                    d[json_col] = json.loads(d[json_col])
                except Exception:
                    d[json_col] = {}
        d["is_active"] = bool(d.get("is_active", 1))
        return d

    @staticmethod
    async def get_active_ads(slot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取当前生效的广告列表 (前台调用)"""
        db = await get_db_connection()
        try:
            query = """
                SELECT * FROM ads 
                WHERE is_active = 1 
                  AND (start_date IS NULL OR start_date <= datetime('now'))
                  AND (end_date IS NULL OR end_date >= datetime('now'))
            """
            params = []
            if slot_id:
                query += " AND slot_id = ?"
                params.append(slot_id)
            query += " ORDER BY sort_order ASC, id DESC"
            
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            return [AdsService._row_to_dict(r) for r in rows]
        finally:
            await db.close()

    @staticmethod
    async def get_all_ads(slot_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取所有广告（含未激活/已下线，后台管理调用）"""
        db = await get_db_connection()
        try:
            query = "SELECT * FROM ads"
            params = []
            if slot_id:
                query += " WHERE slot_id = ?"
                params.append(slot_id)
            query += " ORDER BY sort_order ASC, id DESC"
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            return [AdsService._row_to_dict(r) for r in rows]
        finally:
            await db.close()

    @staticmethod
    async def create_ad(data: AdCreate) -> int:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                """INSERT INTO ads (slot_id, title, title_i18n, description, desc_i18n, link_url, image_url, action_type, wechat_id, format, is_active, sort_order, start_date, end_date)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data.slot_id,
                    data.title,
                    json.dumps(data.title_i18n),
                    data.description,
                    json.dumps(data.desc_i18n),
                    data.link_url,
                    data.image_url,
                    data.action_type,
                    data.wechat_id,
                    data.format,
                    1 if data.is_active else 0,
                    data.sort_order,
                    data.start_date,
                    data.end_date
                )
            )
            await db.commit()
            return cursor.lastrowid
        finally:
            await db.close()

    @staticmethod
    async def update_ad(ad_id: int, data: AdUpdate) -> bool:
        db = await get_db_connection()
        try:
            fields = []
            values = []
            update_data = data.model_dump(exclude_unset=True)
            for k, v in update_data.items():
                if k in ("title_i18n", "desc_i18n") and isinstance(v, dict):
                    v = json.dumps(v)
                elif k == "is_active":
                    v = 1 if v else 0
                fields.append(f"{k} = ?")
                values.append(v)
            if not fields:
                return True
            fields.append("updated_at = datetime('now')")
            values.append(ad_id)
            sql = f"UPDATE ads SET {', '.join(fields)} WHERE id = ?"
            cursor = await db.execute(sql, values)
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def delete_ad(ad_id: int) -> bool:
        db = await get_db_connection()
        try:
            cursor = await db.execute("DELETE FROM ads WHERE id = ?", (ad_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def toggle_ad(ad_id: int) -> Optional[bool]:
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT is_active FROM ads WHERE id = ?", (ad_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            new_state = 0 if row["is_active"] else 1
            await db.execute("UPDATE ads SET is_active = ?, updated_at = datetime('now') WHERE id = ?", (new_state, ad_id))
            await db.commit()
            return bool(new_state)
        finally:
            await db.close()

    @staticmethod
    async def record_click(ad_id: int):
        db = await get_db_connection()
        try:
            await db.execute("UPDATE ads SET click_count = click_count + 1 WHERE id = ?", (ad_id,))
            await db.commit()
        finally:
            await db.close()

    @staticmethod
    async def record_close(ad_id: int):
        db = await get_db_connection()
        try:
            await db.execute("UPDATE ads SET close_count = close_count + 1 WHERE id = ?", (ad_id,))
            await db.commit()
        finally:
            await db.close()
