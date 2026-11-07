/**
 * pwa.js - 超级工具箱 Pro 移动端 PWA 离线体验与主屏幕安装交互增强
 * 1. Service Worker 自动注册与静默更新
 * 2. 离线/在线状态检测与沉浸式 Banner 提示
 * 3. PWA 安装引导 (支持 Chrome/Edge beforeinstallprompt 及 iOS Safari 提示)
 */

(function () {
    'use strict';

    // 1. 注册 Service Worker
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                // 监听后台更新
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    if (!installingWorker) return;
                    installingWorker.onstatechange = () => {
                        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[PWA] New content is available; please refresh.');
                        }
                    };
                };
            }).catch((err) => {
                console.warn('[PWA] Service Worker registration failed:', err);
            });
        });
    }

    // 2. 离线状态指示器 (Offline / Online Indicator)
    function setupNetworkStatusIndicator() {
        let banner = document.getElementById('pwa-network-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'pwa-network-banner';
            banner.className = 'fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-xs font-medium text-center transition-all duration-300 transform -translate-y-full flex items-center justify-center gap-2 shadow-md';
            document.body.appendChild(banner);
        }

        function updateStatus(isOnline) {
            if (!isOnline) {
                banner.className = 'fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-xs font-semibold text-center transition-all duration-300 transform translate-y-0 flex items-center justify-center gap-2 shadow-md bg-emerald-600 text-white';
                banner.innerHTML = '<i class="fas fa-wifi-slash text-xs"></i> <span>已进入离线模式 · 本地所有工具与 AI 引擎均可离线运行，隐私绝对安全</span>';
            } else {
                if (banner.classList.contains('translate-y-0')) {
                    banner.className = 'fixed top-0 left-0 right-0 z-[9999] px-4 py-2 text-xs font-semibold text-center transition-all duration-300 transform translate-y-0 flex items-center justify-center gap-2 shadow-md bg-zinc-800 text-zinc-100';
                    banner.innerHTML = '<i class="fas fa-wifi text-xs text-emerald-400"></i> <span>已恢复网络连接</span>';
                    setTimeout(() => {
                        banner.classList.add('-translate-y-full');
                        banner.classList.remove('translate-y-0');
                    }, 2500);
                }
            }
        }

        window.addEventListener('offline', () => updateStatus(false));
        window.addEventListener('online', () => updateStatus(true));

        if (!navigator.onLine) {
            updateStatus(false);
        }
    }

    // 3. PWA 安装引导 (Install Prompt)
    let deferredPrompt = null;
    function setupInstallPrompt() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (isStandalone) return; // 已经是安装后独立窗口打开，不打扰用户

        window.addEventListener('beforeinstallprompt', (e) => {
            // 阻止默认 mini-infobar
            e.preventDefault();
            deferredPrompt = e;

            // 检查之前是否在 7 天内关闭过
            const dismissedAt = localStorage.getItem('pwa_install_dismissed_at');
            if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 7 * 86400000) {
                return;
            }

            showInstallBanner();
        });
    }

    function showInstallBanner() {
        if (document.getElementById('pwa-install-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-200 animate-fade-in';
        banner.innerHTML = `
            <div class="flex items-center gap-3">
                <img src="/icons/icon-192.png" alt="Logo" class="w-10 h-10 rounded-xl shadow-xs shrink-0" />
                <div class="text-left">
                    <div class="text-xs font-bold leading-tight">安装超级工具箱 App</div>
                    <div class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">支持断网秒开，像原生应用一样运行</div>
                </div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
                <button id="pwa-install-btn" class="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors">安装</button>
                <button id="pwa-dismiss-btn" class="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg text-xs" title="关闭"><i class="fas fa-xmark"></i></button>
            </div>
        `;
        document.body.appendChild(banner);

        document.getElementById('pwa-install-btn')?.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] User response to install prompt:', outcome);
            deferredPrompt = null;
            banner.remove();
        });

        document.getElementById('pwa-dismiss-btn')?.addEventListener('click', () => {
            localStorage.setItem('pwa_install_dismissed_at', Date.now().toString());
            banner.remove();
        });
    }

    // 初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupNetworkStatusIndicator();
            setupInstallPrompt();
        });
    } else {
        setupNetworkStatusIndicator();
        setupInstallPrompt();
    }
})();
