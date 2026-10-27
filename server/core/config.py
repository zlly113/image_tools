import os
import json
from dotenv import load_dotenv

# 预加载 .env 配置文件 (如果存在)
load_dotenv()

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseModel as BaseSettings

INSECURE_DEFAULT_ADMIN_TOKEN = "test-admin-secret-token"
INSECURE_DEFAULT_JWT_SECRET = "super_toolbox_jwt_secret_key_2026_change_in_prod"

INSECURE_DEFAULT_ADMIN_TOKENS = {
    INSECURE_DEFAULT_ADMIN_TOKEN,
    "your_secure_admin_token_here_replace_me",
    "admin",
    "123456",
    "secret",
}

INSECURE_DEFAULT_JWT_SECRETS = {
    INSECURE_DEFAULT_JWT_SECRET,
    "your_secure_jwt_secret_key_here_replace_me",
    "secret",
    "jwt_secret",
}

def _get_cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS")
    if raw:
        try:
            return json.loads(raw)
        except Exception:
            return [x.strip() for x in raw.split(",") if x.strip()]
    return [
        "https://hhdzai.top",
        "https://www.hhdzai.top",
        "http://localhost",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

class Settings(BaseSettings):
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Super Toolbox Pro Backend")
    VERSION: str = os.getenv("VERSION", "1.0.0")
    API_V1_STR: str = os.getenv("API_V1_STR", "/api/v1")
    
    # 运行环境: development | production
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # 是否开启 OpenAPI / Swagger 交互式文档 (生产环境默认关闭)
    ENABLE_API_DOCS: bool | None = None
    
    # 数据库路径 (默认在 data/toolbox.db)
    DB_PATH: str = os.getenv("DB_PATH", "data/toolbox.db")
    
    # Phase 1 管理员 Token 保护 (静态 Token 仅用于应急/内部调用，生产环境建议关闭)
    ADMIN_TOKEN: str = os.getenv("ADMIN_TOKEN", INSECURE_DEFAULT_ADMIN_TOKEN)
    ENABLE_STATIC_ADMIN_TOKEN: bool = os.getenv("ENABLE_STATIC_ADMIN_TOKEN", "true").lower() in ("true", "1", "yes")
    
    # 首次管理员初始化 Token (仅当通过 HTTP 接口引导时需要，为空则强制只能由命令行 create_admin.py 初始化)
    SETUP_ADMIN_TOKEN: str | None = os.getenv("SETUP_ADMIN_TOKEN", None)
    
    # Phase 2a JWT 与用户系统配置
    JWT_SECRET: str = os.getenv("JWT_SECRET", INSECURE_DEFAULT_JWT_SECRET)
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "2"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
    FIRST_ADMIN_EMAIL: str = os.getenv("FIRST_ADMIN_EMAIL", "admin@hhdzai.top")
    REGISTER_BONUS_CREDITS: int = int(os.getenv("REGISTER_BONUS_CREDITS", "50"))
    
    # 允许的跨域来源
    CORS_ORIGINS: list[str] = _get_cors_origins()

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() in ("production", "prod")

    @property
    def docs_enabled(self) -> bool:
        raw_env = os.getenv("ENABLE_API_DOCS")
        if raw_env is not None:
            return raw_env.strip().lower() in ("true", "1", "yes")
        if self.ENABLE_API_DOCS is not None:
            return bool(self.ENABLE_API_DOCS)
        return not self.is_production

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

def check_security_config() -> list[str]:
    """检查系统安全配置项，返回警告信息列表并在控制台输出警示；生产环境检测到严重不安全配置将阻断启动"""
    warnings = []
    
    is_insecure_admin = settings.ADMIN_TOKEN in INSECURE_DEFAULT_ADMIN_TOKENS or not settings.ADMIN_TOKEN.strip()
    is_insecure_jwt = settings.JWT_SECRET in INSECURE_DEFAULT_JWT_SECRETS or len(settings.JWT_SECRET.strip()) < 32

    if is_insecure_admin:
        warnings.append(f"ADMIN_TOKEN 使用了不安全的默认值或占位符 ('{settings.ADMIN_TOKEN}')！")
        
    if is_insecure_jwt:
        warnings.append("JWT_SECRET 使用了不安全的默认值或密钥长度不足 32 字符！")

    if settings.is_production:
        if is_insecure_jwt:
            raise RuntimeError(
                "[FATAL SECURITY ERROR] 生产环境下 JWT_SECRET 必须配置为至少 32 位的强随机密钥！\n"
                "检测到仍在使用默认密钥或占位符。请在 .env 中设置强随机 JWT_SECRET 后重启。\n"
                "生成命令: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        if is_insecure_admin and settings.ENABLE_STATIC_ADMIN_TOKEN:
            raise RuntimeError(
                "[FATAL SECURITY ERROR] 生产环境下启用了静态 ADMIN_TOKEN，但使用了不安全的默认值或占位符！\n"
                "请在 .env 中配置高强度随机 ADMIN_TOKEN，或设置 ENABLE_STATIC_ADMIN_TOKEN=false 禁用静态 Token。"
            )
        if warnings:
            print("\n" + "=" * 72)
            print(">>> [SECURITY ALERT] 生产环境安全警告 (PRODUCTION SECURITY ALERT) <<<")
            for w in warnings:
                print(f" [!] {w}")
            print("=" * 72 + "\n")
    else:
        if warnings:
            print("[Security Notice] 当前处于开发模式 (development)，正在使用默认测试密钥。")
            
    return warnings
