import json
import aiosqlite
from server.core.database import get_db_connection

CREATE_TABLES_SQL = """
-- 1. 站点全局配置表
CREATE TABLE IF NOT EXISTS site_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 2. 广告表
CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id TEXT NOT NULL,
    title TEXT NOT NULL,
    title_i18n TEXT DEFAULT '{}',
    description TEXT DEFAULT '',
    desc_i18n TEXT DEFAULT '{}',
    link_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    action_type TEXT DEFAULT 'link',
    wechat_id TEXT DEFAULT '',
    format TEXT DEFAULT 'banner',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    click_count INTEGER DEFAULT 0,
    close_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. 外链/工具推荐表
CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    title_i18n TEXT DEFAULT '{}',
    description TEXT DEFAULT '',
    desc_i18n TEXT DEFAULT '{}',
    url TEXT NOT NULL,
    icon_svg TEXT DEFAULT '',
    icon_class TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    click_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ads_slot_active ON ads(slot_id, is_active);
CREATE INDEX IF NOT EXISTS idx_links_cat_active ON links(category, is_active);

-- 4. 访问与事件明细日志表
CREATE TABLE IF NOT EXISTS visit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'page_view',
    event_name TEXT NOT NULL DEFAULT '',
    status TEXT DEFAULT 'ok',
    duration_ms INTEGER DEFAULT 0,
    referrer TEXT DEFAULT '',
    device_type TEXT DEFAULT 'desktop',
    os TEXT DEFAULT '',
    browser TEXT DEFAULT '',
    language TEXT DEFAULT '',
    ip_hash TEXT DEFAULT '',
    created_at INTEGER DEFAULT (unixepoch()),
    stat_date TEXT DEFAULT (date('now', '+8 hours'))
);

CREATE INDEX IF NOT EXISTS idx_visit_logs_date ON visit_logs(stat_date, event_type);
CREATE INDEX IF NOT EXISTS idx_visit_logs_sess ON visit_logs(session_id, stat_date);

-- 5. 每日预聚合数据表
CREATE TABLE IF NOT EXISTS daily_stats (
    stat_date TEXT PRIMARY KEY,
    pv INTEGER DEFAULT 0,
    uv INTEGER DEFAULT 0,
    ip_count INTEGER DEFAULT 0,
    session_count INTEGER DEFAULT 0,
    bounce_count INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    feature_stats TEXT DEFAULT '{}',
    device_stats TEXT DEFAULT '{}',
    updated_at INTEGER DEFAULT (unixepoch())
);

-- ============================================================
-- Phase 2a: 用户系统 + 额度系统 (D1-D8 规范)
-- ============================================================

-- 6. 订阅计划表（2a 建表预留）
CREATE TABLE IF NOT EXISTS subscription_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL, -- free|pro_monthly|pro_yearly|payg
    display_name TEXT NOT NULL,
    price_cents INTEGER DEFAULT 0, -- 分为单位，29元=2900
    period TEXT DEFAULT '', -- month|year|once
    credits_per_period INTEGER DEFAULT 0,
    daily_free_limit INTEGER DEFAULT 0, -- 阶段六预留；2a 不读取，以 tool_pricing 为准
    features TEXT DEFAULT '{}',
    is_active INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 7. 用户主表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT DEFAULT '',
    role TEXT DEFAULT 'user', -- 'user' | 'admin' | 'superadmin'
    is_active INTEGER DEFAULT 1,
    credit_balance INTEGER DEFAULT 0, -- 付费点数余额
    plan_id INTEGER,
    last_login_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 8. 点数交易流水（核心审计表，只增不删）
CREATE TABLE IF NOT EXISTS credit_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL, -- 正=充值/赠送, 负=扣费, 0=免费使用
    type TEXT NOT NULL, -- recharge|deduct|refund|subscribe|admin|free_use
    balance_after INTEGER NOT NULL, -- 变动后真实余额快照
    ref_type TEXT DEFAULT '', -- tool:remove_bg | order:123 | admin:uid5 | register_bonus
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_type ON credit_transactions(type, created_at DESC);

-- 9. 用户订阅记录表（2a 建表预留）
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    status TEXT DEFAULT 'active', -- active|expired|cancelled
    started_at TEXT NOT NULL,
    expires_at TEXT, -- NULL = 永久(payg)
    auto_renew INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
);

-- 10. 工具定价与规则表
CREATE TABLE IF NOT EXISTS tool_pricing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tool_key TEXT UNIQUE NOT NULL, -- remove_bg|ocr|qr_generate|ai_img_gen...
    display_name TEXT NOT NULL,
    credits_per_use INTEGER NOT NULL DEFAULT 1, -- 每次使用扣费点数
    daily_free_limit INTEGER DEFAULT 3, -- 0 代表无免费额度（纯付费）
    free_tier_allowed INTEGER DEFAULT 1, -- 免费用户是否可用
    is_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- 11. 每日使用统计表（免费额度限制）
CREATE TABLE IF NOT EXISTS daily_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tool_key TEXT NOT NULL,
    use_date TEXT NOT NULL, -- YYYY-MM-DD
    use_count INTEGER DEFAULT 0,
    UNIQUE(user_id, tool_key, use_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_daily_usage_lookup ON daily_usage(user_id, tool_key, use_date);

-- 12. 刷新令牌存储表
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL, -- SHA-256(token)，不存明文
    expires_at TEXT NOT NULL,
    is_revoked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id, is_revoked);

-- 13. 管理员操作审计表
CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER,
    action TEXT NOT NULL, -- create|update|delete|toggle|recharge|adjust
    target TEXT NOT NULL, -- ad|link|config|user|credits|pricing
    target_id INTEGER,
    detail TEXT, -- JSON 快照
    ip_address TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (admin_id) REFERENCES users(id)
);

-- 14. 平台自建短链映射表 (原生极速 302 重定向，无第三方广告与中转等待页)
CREATE TABLE IF NOT EXISTS short_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    original_url TEXT NOT NULL,
    created_ip TEXT DEFAULT '',
    click_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_short_links_code ON short_links(code);
"""

async def init_database_tables():
    db = await get_db_connection()
    try:
        await db.executescript(CREATE_TABLES_SQL)
        await seed_initial_data(db)
    finally:
        await db.close()

async def seed_initial_data(db: aiosqlite.Connection):
    """注入 Phase 1 与 Phase 2a 默认初始数据"""
    # 1. 默认站点配置
    default_configs = [
        ("site_name", "超级工具箱 Pro", "网站名称"),
        ("site_version", "2.0.0", "网站版本"),
        ("announcement", "欢迎使用超级工具箱 Pro！所有图片与数据完全本地处理，安全高效。", "全站公告"),
        ("announcement_i18n", json.dumps({
            "zh-CN": "欢迎使用超级工具箱 Pro！所有图片与数据完全本地处理，安全高效。",
            "en-US": "Welcome to Super Toolbox Pro! Local processing, 100% private and efficient."
        }), "多语言公告"),
        ("announcement_active", "0", "是否开启全站公告 (1/0)"),
        ("maintenance_mode", "0", "是否开启维护模式 (1/0)"),
        ("ocr_modelscope_repo", "", "OCR离线模型魔搭加速仓库(可选，留空则默认走本地)"),
        ("default_locale", "zh-CN", "默认语言"),
        ("available_locales", json.dumps(["zh-CN", "en-US"]), "系统支持的语言列表"),
        ("features", json.dumps({
            "ocr_enabled": True,
            "shortlink_enabled": True,
            "ai_tools_enabled": False
        }), "功能模块开关")
    ]
    for k, v, desc in default_configs:
        await db.execute(
            "INSERT OR IGNORE INTO site_config (key, value, description) VALUES (?, ?, ?)",
            (k, v, desc)
        )

    # 2. 初始默认广告
    cursor = await db.execute("SELECT COUNT(*) FROM ads")
    ads_count = (await cursor.fetchone())[0]
    if ads_count == 0:
        default_ads = [
            (
                "top-banner",
                "🚀 本站黄金广告位招商中",
                json.dumps({"zh-CN": "🚀 本站黄金广告位招商中", "en-US": "🚀 Premium Ad Spot Available"}),
                "获取海量精准曝光，点击联系客服微信洽谈合作",
                json.dumps({"zh-CN": "获取海量精准曝光，点击联系客服微信洽谈合作", "en-US": "Reach massive targeted traffic. Click to contact us."}),
                "javascript:void(0);",
                "",
                "wechat",
                "duobaoerbao",
                "banner",
                1,
                0
            ),
            (
                "sidebar-ad",
                "多宝美优品",
                json.dumps({"zh-CN": "多宝美优品", "en-US": "DuoBao Premium Store"}),
                "海淘直邮代购 · 正品保障",
                json.dumps({"zh-CN": "海淘直邮代购 · 正品保障", "en-US": "Direct Import & Quality Guaranteed"}),
                "https://myp.hhdzai.top",
                "",
                "link",
                "",
                "square",
                1,
                0
            )
        ]
        await db.executemany(
            """INSERT INTO ads (slot_id, title, title_i18n, description, desc_i18n, link_url, image_url, action_type, wechat_id, format, is_active, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            default_ads
        )

    # 3. 初始默认外链 / 推荐工具
    cursor = await db.execute("SELECT COUNT(*) FROM links")
    links_count = (await cursor.fetchone())[0]
    if links_count == 0:
        default_links = [
            ("tool", "打字练习", json.dumps({"zh-CN": "打字练习", "en-US": "Typing Practice"}), "在线打字指法训练", json.dumps({"zh-CN": "在线打字指法训练", "en-US": "Online typing practice"}), "https://dazi.229118.xyz/", "", "fa-keyboard", 1),
            ("tool", "IT工具箱", json.dumps({"zh-CN": "IT工具箱", "en-US": "IT Tools"}), "开发者极客全能工具", json.dumps({"zh-CN": "开发者极客全能工具", "en-US": "Developer Swiss-knife tools"}), "https://ittools.229118.xyz/", "", "fa-tools", 2),
            ("tool", "PDF工具", json.dumps({"zh-CN": "PDF工具", "en-US": "PDF Tools"}), "PDF合并分割与转换", json.dumps({"zh-CN": "PDF合并分割与转换", "en-US": "PDF merge, split & convert"}), "https://pdf.229118.xyz/", "", "fa-file-pdf", 3),
            ("tool", "DOS老游戏", json.dumps({"zh-CN": "DOS老游戏", "en-US": "DOS Games"}), "怀旧经典网页游戏", json.dumps({"zh-CN": "怀旧经典网页游戏", "en-US": "Classic nostalgic web games"}), "https://dosgame.229118.xyz/", "", "fa-gamepad", 4)
        ]
        await db.executemany(
            """INSERT INTO links (category, title, title_i18n, description, desc_i18n, url, icon_svg, icon_class, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            default_links
        )

    # 4. Phase 2a: 默认订阅计划 (payg 默认)
    default_plans = [
        ("payg", "按量付费", 0, "", 0, 0, '{}', 1, 0),
        ("free", "免费用户", 0, "", 0, 0, '{"local_tools": true}', 1, 1),
    ]
    await db.executemany(
        """INSERT OR IGNORE INTO subscription_plans (name, display_name, price_cents, period, credits_per_period, daily_free_limit, features, is_active, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        default_plans
    )

    # 5. Phase 2a: 默认工具定价（本地工具 cost=0；付费演示工具 cost=10）
    default_pricing = [
        ("remove_bg", "智能抠图", 0, 3, 1, 1),
        ("collage", "多图拼接", 0, 0, 1, 1),
        ("converter", "格式转换", 0, 0, 1, 1),
        ("enhancer", "滤镜修复", 0, 0, 1, 1),
        ("ocr", "OCR识别", 0, 3, 1, 1),
        ("qr_generate", "二维码生成", 0, 5, 1, 1),
        ("qr_scan", "二维码识别", 0, 5, 1, 1),
        ("shortlink", "短链接生成", 0, 10, 1, 1),
        ("exif_watermark", "EXIF水印", 0, 0, 1, 1),
        ("ai_img_gen", "AI文生图", 10, 0, 1, 1), # 演示/压测用付费工具 (无免费额度)
    ]
    await db.executemany(
        """INSERT OR IGNORE INTO tool_pricing (tool_key, display_name, credits_per_use, daily_free_limit, free_tier_allowed, is_enabled)
           VALUES (?, ?, ?, ?, ?, ?)""",
        default_pricing
    )

    # 6. 清理已过期的 refresh_tokens（v0.3 规范）
    await db.execute("DELETE FROM refresh_tokens WHERE expires_at < datetime('now')")
    await db.commit()

