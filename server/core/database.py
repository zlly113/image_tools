import os
import aiosqlite
from server.core.config import settings

async def init_db():
    """确保数据目录存在并初始化 SQLite 数据库"""
    os.makedirs(os.path.dirname(settings.DB_PATH), exist_ok=True)
    async with aiosqlite.connect(settings.DB_PATH, isolation_level=None) as db:
        # 1. 开启 WAL 模式 (提升并发读写性能)
        await db.execute("PRAGMA journal_mode = WAL;")
        # 2. 设置忙时等待超时时间为 5000ms
        await db.execute("PRAGMA busy_timeout = 5000;")
        # 3. 启用外键约束
        await db.execute("PRAGMA foreign_keys = ON;")

async def get_db_connection() -> aiosqlite.Connection:
    """
    获取启用了 WAL、row_factory 以及手工控制事务 (isolation_level=None) 的数据库连接。
    D4: 关闭 Python 隐式事务，完全交由应用层显式控制 BEGIN IMMEDIATE
    """
    db = await aiosqlite.connect(settings.DB_PATH, isolation_level=None)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA busy_timeout = 5000;")
    await db.execute("PRAGMA foreign_keys = ON;")
    return db

