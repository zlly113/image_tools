import json
import aiosqlite
from typing import Dict, Any, List
from server.core.database import get_db_connection
from server.models.schemas import PublicSiteConfig

class ConfigService:
    @staticmethod
    async def get_all_raw_configs() -> Dict[str, Any]:
        """获取所有原始 key-value 配置 (供后台使用)"""
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT key, value, description, updated_at FROM site_config")
            rows = await cursor.fetchall()
            return [
                {
                    "key": row["key"],
                    "value": row["value"],
                    "description": row["description"],
                    "updated_at": row["updated_at"]
                }
                for row in rows
            ]
        finally:
            await db.close()

    @staticmethod
    async def get_public_config() -> PublicSiteConfig:
        """获取聚合后的公开配置对象 (供前台使用)"""
        db = await get_db_connection()
        try:
            cursor = await db.execute("SELECT key, value FROM site_config")
            rows = await cursor.fetchall()
            config_dict = {row["key"]: row["value"] for row in rows}
            
            # 解析 JSON 字段并增加容错保证
            announcement_i18n = {}
            if "announcement_i18n" in config_dict:
                try:
                    parsed = json.loads(config_dict["announcement_i18n"])
                    if isinstance(parsed, dict):
                        announcement_i18n = {str(k): str(v) for k, v in parsed.items()}
                except Exception:
                    pass

            available_locales = ["zh-CN", "en-US"]
            if "available_locales" in config_dict:
                try:
                    parsed = json.loads(config_dict["available_locales"])
                    if isinstance(parsed, list):
                        available_locales = [str(x) for x in parsed if x]
                except Exception:
                    pass

            features = {
                "ocr_enabled": True,
                "shortlink_enabled": True,
                "ai_tools_enabled": False
            }
            if "features" in config_dict:
                try:
                    parsed = json.loads(config_dict["features"])
                    if isinstance(parsed, dict):
                        features.update({str(k): bool(v) for k, v in parsed.items()})
                except Exception:
                    pass

            return PublicSiteConfig(
                site_name=config_dict.get("site_name", "超级工具箱 Pro"),
                site_version=config_dict.get("site_version", "2.0.0"),
                announcement=config_dict.get("announcement", ""),
                announcement_i18n=announcement_i18n,
                announcement_active=config_dict.get("announcement_active", "0") in ("1", "true", "True"),
                maintenance_mode=config_dict.get("maintenance_mode", "0") in ("1", "true", "True"),
                default_locale=config_dict.get("default_locale", "zh-CN"),
                available_locales=available_locales,
                ocr_modelscope_repo=config_dict.get("ocr_modelscope_repo", ""),
                features=features
            )
        finally:
            await db.close()

    @staticmethod
    async def update_config(key: str, value: str, description: str = None) -> bool:
        """更新某项配置，严格校验 JSON 格式配置项以防污染全局配置导致 500"""
        if key == "features":
            try:
                parsed = json.loads(value)
                if not isinstance(parsed, dict):
                    from fastapi import HTTPException
                    raise HTTPException(400, "features 配置项必须为合法的 JSON 对象 (字典)")
            except (json.JSONDecodeError, ValueError):
                from fastapi import HTTPException
                raise HTTPException(400, "features 配置项必须为合法的 JSON 格式")
        elif key == "announcement_i18n":
            try:
                parsed = json.loads(value)
                if not isinstance(parsed, dict):
                    from fastapi import HTTPException
                    raise HTTPException(400, "announcement_i18n 配置项必须为合法的 JSON 对象")
            except (json.JSONDecodeError, ValueError):
                from fastapi import HTTPException
                raise HTTPException(400, "announcement_i18n 配置项必须为合法的 JSON 格式")
        elif key == "available_locales":
            try:
                parsed = json.loads(value)
                if not isinstance(parsed, list):
                    from fastapi import HTTPException
                    raise HTTPException(400, "available_locales 配置项必须为合法的 JSON 数组")
            except (json.JSONDecodeError, ValueError):
                from fastapi import HTTPException
                raise HTTPException(400, "available_locales 配置项必须为合法的 JSON 格式")

        db = await get_db_connection()
        try:
            if description:
                await db.execute(
                    """INSERT INTO site_config (key, value, description, updated_at) 
                       VALUES (?, ?, ?, datetime('now'))
                       ON CONFLICT(key) DO UPDATE SET 
                         value=excluded.value, 
                         description=excluded.description, 
                         updated_at=datetime('now')""",
                    (key, value, description)
                )
            else:
                await db.execute(
                    """INSERT INTO site_config (key, value, updated_at) 
                       VALUES (?, ?, datetime('now'))
                       ON CONFLICT(key) DO UPDATE SET 
                         value=excluded.value, 
                         updated_at=datetime('now')""",
                    (key, value)
                )
            await db.commit()
            return True
        finally:
            await db.close()
