import time
import json
import hashlib
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Request, Depends, HTTPException, status
from pydantic import BaseModel, Field
from server.api.deps import verify_admin_token
from server.core.security import get_real_client_ip
from server.core.database import get_db_connection

router = APIRouter()

# ----------------- 内存缓冲队列与定时刷库 -----------------
WRITE_BUFFER: List[tuple] = []
BUFFER_LOCK = asyncio.Lock()
IP_RATE_LIMIT: Dict[str, List[float]] = {}
RATE_LIMIT_CLEANUP_TIME = 0.0

ALLOWED_EVENT_TYPES = {'page_view', 'feature_use', 'heartbeat', 'page_leave'}
ALLOWED_EVENT_NAMES = {
    'bg_remover', 'collage', 'converter', 'enhancer', 'qrcode', 'shortlink', 'ocr',
    'global_tab_switch', 'index_load', 'page_view',
    'bg_remover_export', 'collage_export', 'converter_export', 'enhancer_export',
    'qr_generate', 'qr_decode', 'shortlink_generate', 'ocr_recognize', 'ocr_export'
}
IP_SALT = "image_tools_analytics_2026_salt"

class TrackPayload(BaseModel):
    visitor_id: str = Field(..., max_length=64)
    session_id: str = Field(..., max_length=64)
    event_type: str = Field(..., max_length=32)
    event_name: str = Field(..., max_length=64)
    status: Optional[str] = Field("ok", max_length=16)
    duration_ms: Optional[int] = Field(0, ge=0, le=86400000)
    referrer: Optional[str] = Field("", max_length=255)
    device_type: Optional[str] = Field("desktop", max_length=32)
    os: Optional[str] = Field("", max_length=32)
    browser: Optional[str] = Field("", max_length=32)
    language: Optional[str] = Field("", max_length=16)

def hash_ip(ip: str) -> str:
    """匿名脱敏 IP：仅存前 16 位哈希值"""
    if not ip:
        return ""
    return hashlib.sha256(f"{ip}_{IP_SALT}".encode()).hexdigest()[:16]

def check_rate_limit(client_ip: str) -> bool:
    """简易滑动窗口限流：单个 IP 每分钟不超过 60 次上报"""
    global RATE_LIMIT_CLEANUP_TIME
    now = time.time()
    if now - RATE_LIMIT_CLEANUP_TIME > 60:
        for k in list(IP_RATE_LIMIT.keys()):
            IP_RATE_LIMIT[k] = [t for t in IP_RATE_LIMIT[k] if now - t < 60]
            if not IP_RATE_LIMIT[k]:
                del IP_RATE_LIMIT[k]
        RATE_LIMIT_CLEANUP_TIME = now

    records = IP_RATE_LIMIT.get(client_ip, [])
    records = [t for t in records if now - t < 60]
    if len(records) >= 60:
        return False
    records.append(now)
    IP_RATE_LIMIT[client_ip] = records
    return True

async def flush_buffer_to_db():
    """将内存缓冲批量写入 SQLite"""
    global WRITE_BUFFER
    if not WRITE_BUFFER:
        return
    async with BUFFER_LOCK:
        batch = WRITE_BUFFER[:]
        WRITE_BUFFER = []

    if not batch:
        return

    try:
        db = await get_db_connection()
        try:
            await db.executemany("""
                INSERT INTO visit_logs (
                    visitor_id, session_id, event_type, event_name, status,
                    duration_ms, referrer, device_type, os, browser, language, ip_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch)
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        print(f"[Analytics] Failed to flush batch: {e}")

@router.post("/track")
async def track_event(payload: TrackPayload, request: Request):
    """公开上报接口（高吞吐、防刷、入队缓冲）"""
    client_ip = get_real_client_ip(request)

    if not check_rate_limit(client_ip):
        return {"status": "rate_limited"}

    if payload.event_type not in ALLOWED_EVENT_TYPES:
        return {"status": "ignored"}

    ip_h = hash_ip(client_ip)
    record = (
        payload.visitor_id,
        payload.session_id,
        payload.event_type,
        payload.event_name,
        payload.status or "ok",
        payload.duration_ms or 0,
        payload.referrer or "",
        payload.device_type or "desktop",
        payload.os or "",
        payload.browser or "",
        payload.language or "",
        ip_h
    )

    async with BUFFER_LOCK:
        WRITE_BUFFER.append(record)
        if len(WRITE_BUFFER) >= 50:
            asyncio.create_task(flush_buffer_to_db())

    return {"status": "ok"}

# ----------------- 汇总与定时聚合 -----------------
async def aggregate_daily_stats():
    """将历史日志增量聚合成 daily_stats 并保留 90 天明细"""
    try:
        db = await get_db_connection()
        try:
            # 1. 增量聚合：若已有历史汇总则仅聚合当天及昨天（两天前数据已结账不可变），大幅降低 SQLite 锁争用
            stats_count_cur = await db.execute("SELECT COUNT(*) FROM daily_stats")
            has_history = (await stats_count_cur.fetchone())[0] > 0
            date_filter = "WHERE stat_date >= date('now', '+8 hours', '-1 day')" if has_history else ""

            rows = await db.execute_fetchall(f"""
                SELECT 
                    stat_date,
                    COUNT(CASE WHEN event_type = 'page_view' THEN 1 END) as pv,
                    COUNT(DISTINCT visitor_id) as uv,
                    COUNT(DISTINCT ip_hash) as ip_count,
                    COUNT(DISTINCT session_id) as session_count,
                    SUM(duration_ms) as total_duration_ms
                FROM visit_logs
                {date_filter}
                GROUP BY stat_date
            """)

            for r in rows:
                s_date = r['stat_date']
                pv = r['pv'] or 0
                uv = r['uv'] or 0
                ip_cnt = r['ip_count'] or 0
                sess_cnt = r['session_count'] or 0
                tot_dur = r['total_duration_ms'] or 0

                # 聚合功能使用情况
                feat_rows = await db.execute_fetchall("""
                    SELECT event_name, COUNT(*) as cnt, SUM(CASE WHEN status='ok' THEN 1 ELSE 0 END) as ok_cnt
                    FROM visit_logs
                    WHERE stat_date = ? AND event_type = 'feature_use'
                    GROUP BY event_name
                """, (s_date,))
                feat_stats = {row['event_name']: {"total": row['cnt'], "ok": row['ok_cnt']} for row in feat_rows}

                # 聚合设备分布
                dev_rows = await db.execute_fetchall("""
                    SELECT device_type, COUNT(*) as cnt
                    FROM visit_logs
                    WHERE stat_date = ? AND event_type = 'page_view'
                    GROUP BY device_type
                """, (s_date,))
                dev_stats = {row['device_type']: row['cnt'] for row in dev_rows}

                # 计算单页跳出会话 (只有 1 条日志的 session)
                bounce_row = await db.execute_fetchall("""
                    SELECT COUNT(*) as bounce_cnt FROM (
                        SELECT session_id FROM visit_logs 
                        WHERE stat_date = ? 
                        GROUP BY session_id 
                        HAVING COUNT(*) = 1
                    )
                """, (s_date,))
                bounce_cnt = bounce_row[0]['bounce_cnt'] if bounce_row else 0

                await db.execute("""
                    INSERT INTO daily_stats (
                        stat_date, pv, uv, ip_count, session_count, bounce_count,
                        total_duration_ms, feature_stats, device_stats, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())
                    ON CONFLICT(stat_date) DO UPDATE SET
                        pv = excluded.pv,
                        uv = excluded.uv,
                        ip_count = excluded.ip_count,
                        session_count = excluded.session_count,
                        bounce_count = excluded.bounce_count,
                        total_duration_ms = excluded.total_duration_ms,
                        feature_stats = excluded.feature_stats,
                        device_stats = excluded.device_stats,
                        updated_at = unixepoch()
                """, (s_date, pv, uv, ip_cnt, sess_cnt, bounce_cnt, tot_dur, json.dumps(feat_stats), json.dumps(dev_stats)))

            # 2. 清理 90 天前日志
            await db.execute("DELETE FROM visit_logs WHERE stat_date < date('now', '+8 hours', '-90 days')")
            await db.commit()
        finally:
            await db.close()
    except Exception as e:
        print(f"[Analytics] Aggregation failed: {e}")

@router.get("/overview", dependencies=[Depends(verify_admin_token)])
async def get_analytics_overview(days: int = 30):
    """管理员概览接口：汇总指标、趋势折线、功能排行、设备分布"""
    await flush_buffer_to_db()
    await aggregate_daily_stats()

    db = await get_db_connection()
    try:
        # 获取近 N 天每日汇总
        history_rows = await db.execute_fetchall("""
            SELECT * FROM daily_stats 
            ORDER BY stat_date DESC 
            LIMIT ?
        """, (days,))

        history_list = []
        for r in reversed(history_rows):
            history_list.append({
                "stat_date": r['stat_date'],
                "pv": r['pv'],
                "uv": r['uv'],
                "ip_count": r['ip_count'],
                "session_count": r['session_count'],
                "bounce_count": r['bounce_count'],
                "total_duration_ms": r['total_duration_ms'],
                "feature_stats": json.loads(r['feature_stats'] or '{}'),
                "device_stats": json.loads(r['device_stats'] or '{}')
            })

        # 今日数据
        today_row = await db.execute_fetchall("SELECT * FROM daily_stats WHERE stat_date = date('now', '+8 hours')")
        today_data = dict(today_row[0]) if today_row else {
            "pv": 0, "uv": 0, "ip_count": 0, "session_count": 0, "bounce_count": 0, "total_duration_ms": 0,
            "feature_stats": "{}", "device_stats": "{}"
        }
        today_data["feature_stats"] = json.loads(today_data.get("feature_stats") or "{}")
        today_data["device_stats"] = json.loads(today_data.get("device_stats") or "{}")

        # 累计功能榜 (30天总和)
        total_feature_counts: Dict[str, Dict[str, int]] = {}
        total_device_counts: Dict[str, int] = {"desktop": 0, "mobile": 0, "tablet": 0}
        total_pv = sum(item["pv"] for item in history_list)
        total_uv = sum(item["uv"] for item in history_list)

        for h in history_list:
            for f_name, f_data in h["feature_stats"].items():
                if f_name not in total_feature_counts:
                    total_feature_counts[f_name] = {"total": 0, "ok": 0}
                total_feature_counts[f_name]["total"] += f_data.get("total", 0)
                total_feature_counts[f_name]["ok"] += f_data.get("ok", 0)

            for d_name, d_cnt in h["device_stats"].items():
                total_device_counts[d_name] = total_device_counts.get(d_name, 0) + d_cnt

        return {
            "today": today_data,
            "total_pv": total_pv,
            "total_uv": total_uv,
            "trend": history_list,
            "features": total_feature_counts,
            "devices": total_device_counts
        }
    finally:
        await db.close()
