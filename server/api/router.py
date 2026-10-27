from fastapi import APIRouter
from server.api.v1 import config, ads, links, analytics, auth, credits, tools, users

api_router = APIRouter()
api_router.include_router(config.router, prefix="/config", tags=["Site Config"])
api_router.include_router(ads.router, prefix="/ads", tags=["Ads"])
api_router.include_router(links.router, prefix="/links", tags=["Links"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(credits.router, prefix="/credits", tags=["Credits"])
api_router.include_router(tools.router, prefix="/tools", tags=["Tools"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])


