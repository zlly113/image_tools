// js/authService.js
/**
 * Phase 2a 前端认证管理 SDK (对齐 v0.3 规范)
 * - D7: access_token 仅存 JS 内存，绝不落盘 localStorage/sessionStorage，杜绝 XSS 泄露
 * - HttpOnly Cookie 存放长期 refresh_token
 * - 401 拦截器 + refreshPromise 单例并发锁，多请求同时过期只触发 1 次静默刷新
 */

let accessToken = null;
let currentUser = null;
let refreshPromise = null;

export function getAccessToken() {
    return accessToken;
}

export function getCurrentUser() {
    return currentUser;
}

export function isLoggedIn() {
    return !!accessToken;
}

export async function login(email, password) {
    const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'same-origin',
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '登录失败');
    }
    const data = await res.json();
    accessToken = data.access_token;
    currentUser = data.user;
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: currentUser } }));
    return currentUser;
}

export async function register(username, email, password) {
    const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'same-origin',
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '注册失败');
    }
    return await res.json();
}

export async function tryRefresh() {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const res = await fetch('/api/v1/auth/refresh', {
                method: 'POST',
                credentials: 'same-origin',
            });
            if (res.ok) {
                const data = await res.json();
                accessToken = data.access_token;
                // 获取最新用户信息
                const meRes = await fetch('/api/v1/auth/me', {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    credentials: 'same-origin'
                });
                if (meRes.ok) {
                    currentUser = await meRes.json();
                    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: currentUser } }));
                }
                return accessToken;
            }
            accessToken = null;
            currentUser = null;
            window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: null } }));
            return null;
        } catch (e) {
            accessToken = null;
            currentUser = null;
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export async function authFetch(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    let res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    if (res.status === 401) {
        // 尝试静默换票一次
        const newToken = await tryRefresh();
        if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
            res = await fetch(url, { ...options, headers, credentials: 'same-origin' });
        }
    }
    return res;
}

export async function logout() {
    try {
        if (accessToken) {
            await fetch('/api/v1/auth/logout', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}` },
                credentials: 'same-origin'
            });
        }
    } catch (e) {}
    accessToken = null;
    currentUser = null;
    window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user: null } }));
}
