import json
from typing import List, Optional, Dict, Any
from server.core.database import get_db_connection
from server.models.schemas import LinkCreate, LinkUpdate, LinkResponse

class LinksService:
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
    async def get_active_links(category: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取当前生效的外链/工具列表 (前台调用)"""
        db = await get_db_connection()
        try:
            query = "SELECT * FROM links WHERE is_active = 1"
            params = []
            if category:
                query += " AND category = ?"
                params.append(category)
            query += " ORDER BY sort_order ASC, id ASC"
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            return [LinksService._row_to_dict(r) for r in rows]
        finally:
            await db.close()

    @staticmethod
    async def get_all_links(category: Optional[str] = None) -> List[Dict[str, Any]]:
        """获取全部外链/工具（后台管理调用）"""
        db = await get_db_connection()
        try:
            query = "SELECT * FROM links"
            params = []
            if category:
                query += " WHERE category = ?"
                params.append(category)
            query += " ORDER BY sort_order ASC, id ASC"
            cursor = await db.execute(query, params)
            rows = await cursor.fetchall()
            return [LinksService._row_to_dict(r) for r in rows]
        finally:
            await db.close()

    @staticmethod
    async def create_link(data: LinkCreate) -> int:
        db = await get_db_connection()
        try:
            cursor = await db.execute(
                """INSERT INTO links (category, title, title_i18n, description, desc_i18n, url, icon_svg, icon_class, sort_order, is_active)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    data.category,
                    data.title,
                    json.dumps(data.title_i18n),
                    data.description,
                    json.dumps(data.desc_i18n),
                    data.url,
                    data.icon_svg,
                    data.icon_class,
                    data.sort_order,
                    1 if data.is_active else 0
                )
            )
            await db.commit()
            return cursor.lastrowid
        finally:
            await db.close()

    @staticmethod
    async def update_link(link_id: int, data: LinkUpdate) -> bool:
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
            values.append(link_id)
            sql = f"UPDATE links SET {', '.join(fields)} WHERE id = ?"
            cursor = await db.execute(sql, values)
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def delete_link(link_id: int) -> bool:
        db = await get_db_connection()
        try:
            cursor = await db.execute("DELETE FROM links WHERE id = ?", (link_id,))
            await db.commit()
            return cursor.rowcount > 0
        finally:
            await db.close()

    @staticmethod
    async def toggle_link(link_id: int) -> Optional[bool]:
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT is_active FROM links WHERE id = ?", (link_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            new_state = 0 if row["is_active"] else 1
            await db.execute("UPDATE links SET is_active = ?, updated_at = datetime('now') WHERE id = ?", (new_state, link_id))
            await db.commit()
            return bool(new_state)
        finally:
            await db.close()

    @staticmethod
    async def record_click(link_id: int):
        db = await get_db_connection()
        try:
            await db.execute("UPDATE links SET click_count = click_count + 1 WHERE id = ?", (link_id,))
            await db.commit()
        finally:
            await db.close()
