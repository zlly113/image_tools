// admin/js/adminAuth.js
// 管理员认证与会话管理：同时支持 JWT 管理员账号登录与静态 Secret Token

const ADMIN_TOKEN_KEY = 'super_toolbox_admin_token';
const ADMIN_USER_KEY = 'super_toolbox_admin_user';

export function getAdminToken() {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token) {
    if (token) {
        sessionStorage.setItem(ADMIN_TOKEN_KEY, token.trim());
    }
}

export function getAdminUser() {
    try {
        const str = sessionStorage.getItem(ADMIN_USER_KEY);
        return str ? JSON.parse(str) : null;
    } catch (e) {
        return null;
    }
}

export function setAdminUser(user) {
    if (user) {
        sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
    }
}

export function clearAdminToken() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
}

export async function adminLogout() {
    try {
        const token = getAdminToken();
        await fetch('/api/v1/auth/logout', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
    } catch (e) {
        console.warn('Admin logout network error (ignored):', e);
    } finally {
        clearAdminToken();
    }
}

export function isAuthenticated() {
    return Boolean(getAdminToken());
}

/**
 * 使用账号密码直接以管理员身份登录 (走 JWT 鉴权)
 */
export async function adminLoginWithPassword(email, password) {
    const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || '登录失败，请检查账号密码');
    }

    const data = await res.json();
    const user = data.user;

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
        throw new Error('权限不足：该账号不是管理员或超级管理员');
    }

    setAdminToken(data.access_token);
    setAdminUser(user);
    return user;
}

export async function adminFetch(url, options = {}) {
    const token = getAdminToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (token) {
        // 兼容两种鉴权 Header
        headers['X-Admin-Token'] = token;
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {
        clearAdminToken();
        window.dispatchEvent(new CustomEvent('admin-unauthorized'));
        throw new Error('未授权或登录已过期，请重新登录');
    }

    return response;
}
