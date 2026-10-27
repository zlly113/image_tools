import time
from collections import defaultdict

class LoginRateLimiter:
    """
    内存滑动窗口限流器：
    同一 key (client_ip:email) 连续失败 5 次/分钟 → 锁定 15 分钟 (900秒)
    内置定时清理与容量保护，防止内存无限累积与 DoS 攻击
    """
    def __init__(self, max_failures: int = 5, window_sec: int = 60, lock_sec: int = 900, max_entries: int = 10000):
        self.max_failures = max_failures
        self.window_sec = window_sec
        self.lock_sec = lock_sec
        self.max_entries = max_entries
        self._failures = defaultdict(list)
        self._locked_until = defaultdict(float)
        self._last_cleanup = time.time()

    def _cleanup_expired(self, now: float):
        """定期清理过期记录以避免内存泄漏"""
        # 每 300 秒执行一次自动全量清理，或条目超出上限时强制触发
        if now - self._last_cleanup < 300 and len(self._failures) < self.max_entries:
            return

        self._last_cleanup = now
        # 1. 清理过期锁定
        expired_locks = [k for k, v in self._locked_until.items() if v <= now]
        for k in expired_locks:
            self._locked_until.pop(k, None)

        # 2. 清理过期失败记录
        stale_keys = []
        for k, records in list(self._failures.items()):
            active = [t for t in records if now - t < self.window_sec]
            if not active and k not in self._locked_until:
                stale_keys.append(k)
            else:
                self._failures[k] = active

        for k in stale_keys:
            self._failures.pop(k, None)

    def is_locked(self, key: str) -> bool:
        now = time.time()
        self._cleanup_expired(now)
        locked = self._locked_until.get(key, 0)
        if locked > now:
            return True
        if locked > 0:
            self._locked_until.pop(key, None)
            self._failures.pop(key, None)
        return False

    def record_failure(self, key: str):
        now = time.time()
        self._cleanup_expired(now)
        records = [t for t in self._failures[key] if now - t < self.window_sec]
        records.append(now)
        self._failures[key] = records
        if len(records) >= self.max_failures:
            self._locked_until[key] = now + self.lock_sec

    def reset(self, key: str):
        self._failures.pop(key, None)
        self._locked_until.pop(key, None)

login_rate_limiter = LoginRateLimiter()
# 针对后台管理员 Token / API 鉴权的独立防爆破限流器
admin_token_rate_limiter = LoginRateLimiter(max_failures=5, window_sec=60, lock_sec=900)
