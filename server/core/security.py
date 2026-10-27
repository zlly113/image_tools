import bcrypt
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
import jwt
from fastapi import Request
from server.core.config import settings

def _prepare_password_bytes(password: str) -> bytes:
    """
    预处理密码字节串：
    1. 若 <= 72 字节，直接使用原生 UTF-8 字节串（与既有用户 100% 向后兼容）；
    2. 若 > 72 字节（例如长中文字符串），使用 SHA-256 预哈希输出固定 64 字节 ASCII 串，
       既彻底杜绝 bcrypt 72 字节超长异常，又完整保留全部字符熵值，杜绝截断导致的密码碰撞。
    """
    raw_bytes = password.encode('utf-8')
    if len(raw_bytes) > 72:
        return hashlib.sha256(raw_bytes).hexdigest().encode('ascii')
    return raw_bytes

def hash_password(password: str) -> str:
    """使用原生 bcrypt 对明文密码加盐哈希"""
    pwd_bytes = _prepare_password_bytes(password)
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与 bcrypt 哈希"""
    try:
        pwd_bytes = _prepare_password_bytes(plain_password)
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False

def get_real_client_ip(request: Request) -> str:
    """
    安全提取客户端真实 IP：
    1. 优先读取可信反代 (Nginx) 设置的 X-Real-IP 头部；
    2. 若仅存在 X-Forwarded-For，取最后一项（紧邻反代的真实远端 IP），杜绝客户端在首段伪造；
    3. 兜底读取 direct client host。
    """
    if not request:
        return "127.0.0.1"

    real_ip = request.headers.get("x-real-ip")
    if real_ip and real_ip.strip():
        return real_ip.strip()

    xff = request.headers.get("x-forwarded-for")
    if xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if parts:
            return parts[-1]

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"

def create_access_token(user_id: int, role: str) -> str:
    """签发短期 Access Token (默认 2 小时)"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=settings.ACCESS_TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """解码 Access Token，校验失败直接抛出 PyJWTError"""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])

def generate_refresh_token() -> tuple[str, str, datetime]:
    """
    生成长期 Refresh Token
    返回: (明文token, sha256哈希, 过期时间datetime)
    明文仅在 Set-Cookie 时出现一次，数据库只保存 SHA-256 哈希
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = hashlib.sha256(raw_token.encode('utf-8')).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, token_hash, expires_at
