// js/creditService.js
/**
 * Phase 2a 前端额度与扣费管理服务 (对齐 v0.3 规范)
 * - D5: 503 系统繁忙时执行指数退避重试 (1s / 2s / 4s)
 * - 402 余额不足时唤起充值引导模态框
 * - 顶部/侧边栏点数徽标实时联动
 */

import { authFetch, isLoggedIn } from './authService.js';
import { showToast } from './utils.js';

let currentBalance = 0;

export function getCurrentBalance() {
    return currentBalance;
}

export async function refreshBalance() {
    if (!isLoggedIn()) return 0;
    try {
        const res = await authFetch('/api/v1/credits/balance');
        if (res.ok) {
            const data = await res.json();
            currentBalance = data.balance;
            updateCreditBadges(currentBalance);
            return currentBalance;
        }
    } catch (e) {}
    return currentBalance;
}

export function updateCreditBadges(balance) {
    document.querySelectorAll('.user-credit-badge-text').forEach(el => {
        el.textContent = balance;
    });
    document.querySelectorAll('.user-credit-badge-wrap').forEach(el => {
        if (balance < 10) {
            el.classList.add('text-rose-500');
            el.classList.remove('text-indigo-600', 'dark:text-indigo-400');
        } else {
            el.classList.remove('text-rose-500');
            el.classList.add('text-indigo-600', 'dark:text-indigo-400');
        }
    });
}

export async function chargeTool(toolKey, retries = 3) {
    if (!isLoggedIn()) {
        showAuthModal('login');
        throw new Error('请先登录账号后使用');
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await authFetch(`/api/v1/tools/${toolKey}/use`, {
                method: 'POST'
            });

            if (res.status === 503) {
                // D5: 系统繁忙 -> 指数退避 (1s, 2s, 4s)
                const waitMs = Math.min(2 ** attempt * 1000, 4000);
                await new Promise(r => setTimeout(r, waitMs));
                continue;
            }

            if (res.status === 402) {
                const errData = await res.json();
                showRechargeModal(errData.detail || errData);
                return null;
            }

            if (res.ok) {
                const data = await res.json();
                currentBalance = data.balance;
                updateCreditBadges(currentBalance);
                return data; // { status: 'free' | 'charged', balance: ..., remaining_free: ... }
            }

            const err = await res.json();
            throw new Error(err.detail || '扣费失败');
        } catch (e) {
            if (attempt === retries) throw e;
        }
    }
    throw new Error('系统繁忙，请稍后再试');
}

export function showRechargeModal(detail) {
    const modal = document.getElementById('rechargeModal');
    const balEl = document.getElementById('rechargeModalBalance');
    const reqEl = document.getElementById('rechargeModalRequired');
    if (balEl && detail) balEl.textContent = detail.balance !== undefined ? detail.balance : currentBalance;
    if (reqEl && detail) reqEl.textContent = detail.required || 1;
    if (modal) modal.classList.remove('hidden');
}

export function closeRechargeModal() {
    const modal = document.getElementById('rechargeModal');
    if (modal) modal.classList.add('hidden');
}

export function showAuthModal(defaultMode = 'login') {
    const modal = document.getElementById('userAuthModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    switchAuthFormMode(defaultMode);
}

export function closeAuthModal() {
    const modal = document.getElementById('userAuthModal');
    if (modal) modal.classList.add('hidden');
}

export function switchAuthFormMode(mode) {
    const loginForm = document.getElementById('userLoginForm');
    const regForm = document.getElementById('userRegisterForm');
    const title = document.getElementById('userAuthModalTitle');
    if (mode === 'login') {
        if (loginForm) loginForm.classList.remove('hidden');
        if (regForm) regForm.classList.add('hidden');
        if (title) title.textContent = '登录账号 (Sign In)';
    } else {
        if (loginForm) loginForm.classList.add('hidden');
        if (regForm) regForm.classList.remove('hidden');
        if (title) title.textContent = '免费注册 (Sign Up)';
    }
}

window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthFormMode = switchAuthFormMode;
window.closeRechargeModal = closeRechargeModal;
