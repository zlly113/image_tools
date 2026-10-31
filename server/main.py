import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.core.config import settings, check_security_config
from server.core.database import init_db, get_db_connection
from server.models.database_init import init_database_tables
from server.api.router import api_router

import asyncio
from server.api.v1.analytics import flush_buffer_to_db, aggregate_daily_stats

async def background_analytics_worker():
    """后台异步任务：定期刷盘与增量聚合"""
    flush_ticks = 0
    while True:
        try:
            await asyncio.sleep(2)
            await flush_buffer_to_db()
            flush_ticks += 1
            if flush_ticks >= 150: # 每 300 秒 (5 分钟) 触发一次聚合
                flush_ticks = 0
                await aggregate_daily_stats()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[AnalyticsWorker] Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 0. 启动时执行安全配置检查
    check_security_config()

    # 1. 初始化数据库与表结构 (Phase 0/1)
    await init_db()
    await init_database_tables()
    print("[Server] SQLite initialized with WAL mode and initial tables.")
    
    # 2. 启动数据统计分析后台聚合与刷盘 worker
    bg_task = asyncio.create_task(background_analytics_worker())
    yield
    bg_task.cancel()
    await flush_buffer_to_db()
    print("[Server] Shutdown complete.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url="/api/openapi.json" if settings.docs_enabled else None,
    docs_url="/api/docs" if settings.docs_enabled else None,
    redoc_url="/api/redoc" if settings.docs_enabled else None,
    lifespan=lifespan
)

# 配置跨域中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 启用跨域隔离上下文，以支持 ONNX Runtime 多线程 WASM (SharedArrayBuffer)
from fastapi import Request
@app.middleware("http")
async def add_security_and_wasm_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
    response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
    return response

# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/api/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "version": settings.VERSION,
        "mode": "Phase 0/1 (Config, i18n, Ads, Links)"
    }

# --- 静态文件托管 (方便本地开发直接通过 8000 端口访问前台与后台) ---
from fastapi.responses import FileResponse, RedirectResponse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 1. 静态目录挂载 (js, locales, models, admin, icons)
for static_folder in ["js", "locales", "models", "admin", "icons"]:
    folder_path = os.path.join(BASE_DIR, static_folder)
    if os.path.exists(folder_path):
        app.mount(f"/{static_folder}", StaticFiles(directory=folder_path, html=True), name=static_folder)

# 2. 根目录关键静态单文件挂载 (解决 opencv-esm-wrapper.js、robots.txt、sitemap.xml、PWA 404 问题)
@app.get("/opencv-esm-wrapper.js", include_in_schema=False)
async def serve_opencv_wrapper():
    return FileResponse(os.path.join(BASE_DIR, "opencv-esm-wrapper.js"), media_type="application/javascript")

@app.get("/robots.txt", include_in_schema=False)
async def serve_robots():
    return FileResponse(os.path.join(BASE_DIR, "robots.txt"), media_type="text/plain")

@app.get("/sitemap.xml", include_in_schema=False)
async def serve_sitemap():
    return FileResponse(os.path.join(BASE_DIR, "sitemap.xml"), media_type="application/xml")

@app.get("/manifest.json", include_in_schema=False)
async def serve_manifest():
    return FileResponse(os.path.join(BASE_DIR, "manifest.json"), media_type="application/manifest+json")

@app.get("/sw.js", include_in_schema=False)
async def serve_service_worker():
    return FileResponse(os.path.join(BASE_DIR, "sw.js"), media_type="application/javascript")

# 3. 前台首页
@app.get("/", include_in_schema=False)
async def serve_index():
    index_path = os.path.join(BASE_DIR, "index.html")
    return FileResponse(index_path)

# 4. 后台入口
@app.get("/admin", include_in_schema=False)
async def serve_admin():
    admin_path = os.path.join(BASE_DIR, "admin", "index.html")
    return FileResponse(admin_path)

@app.get("/admin/", include_in_schema=False)
async def serve_admin_slash():
    admin_path = os.path.join(BASE_DIR, "admin", "index.html")
    return FileResponse(admin_path)

# 5. 短链接服务已安全下线 (避免主站域名被当作黑产跳板)
@app.get("/s/{code}", include_in_schema=False)
@app.get("/api/s/{code}", include_in_schema=False)
async def redirect_shortlink_endpoint(code: str):
    return RedirectResponse(url="/", status_code=301)



