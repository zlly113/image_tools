import { initTheme, showToast } from './utils.js';
import { initBgRemover } from './bgRemover.js';
import { initCollage } from './collage.js';
import { initConverter } from './converter.js';
import { initEnhancer } from './enhancer.js';
import { initOcr } from './ocr.js';
import { initPdfTools, switchPdfTab, switchOrganizeSubMode, switchConvertSubMode, switchSecuritySubMode } from './pdfTools.js';
import { initQrCode, getQrCodeInstance, setQrCodeInstance, switchLinkToolTab, switchQRSubTab, regenerateQRCode } from './qrCode.js';
import { initShortLink } from './shortLink.js';
import { initAdManager } from './adManager.js';
import { initI18n, setLocale, getLocale, getAvailableLocales, t } from './i18n.js';
import { fetchSiteConfig, fetchLinks, trackLinkClick } from './configService.js';
import { trackPageView, trackFeatureUse } from './tracker.js';
import { tryRefresh, login, register, logout, getCurrentUser, isLoggedIn } from './authService.js';
import { refreshBalance, showAuthModal, closeAuthModal } from './creditService.js';

const globalTabs = {
    'image-station': { url: null },
    'pdf-station': { url: null },
    'link-tools': { url: null },
    'ocr': { url: null }
};

export function switchGlobalTab(tabId) {
    trackPageView(`tab_${tabId}`);

    Object.keys(globalTabs).forEach(key => {
        const section = document.getElementById(`global-section-${key}`);
        const navBtn = document.getElementById(`nav-${key}`);
        const bottomBtn = document.getElementById(`nav-bottom-${key}`);
        
        if (section) {
            section.classList.add('hidden');
        }
        
        if (navBtn) {
            navBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800 border-l-4 border-transparent";
        }
        if (bottomBtn) {
            bottomBtn.className = "flex flex-col items-center justify-center flex-1 py-1 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors";
        }
    });

    const activeSection = document.getElementById(`global-section-${tabId}`);
    const activeNavBtn = document.getElementById(`nav-${tabId}`);
    const activeBottomBtn = document.getElementById(`nav-bottom-${tabId}`);

    if (activeSection) {
        activeSection.classList.remove('hidden');
    }

    if (tabId === 'link-tools') {
        setTimeout(() => {
            const mountPoint = document.getElementById('qr-canvas-mount');
            const hasCanvas = mountPoint && mountPoint.querySelector('canvas');
            let qrCodeInstance = getQrCodeInstance();
            if (!qrCodeInstance || !hasCanvas) {
                if (qrCodeInstance && !hasCanvas) {
                    setQrCodeInstance(null);
                    if (mountPoint) mountPoint.innerHTML = '';
                }
                switchLinkToolTab('qrcode');
                switchQRSubTab('generate');
            } else {
                regenerateQRCode();
            }
        }, 120);
    }
    
    if (tabId === 'ocr') {
        if (typeof window.startOcrEngineLazy === 'function') {
            window.startOcrEngineLazy();
        }
    }
    
    if (activeNavBtn) {
        activeNavBtn.className = "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-600 bg-indigo-50/80 dark:text-indigo-400 dark:bg-slate-800/80 border-l-4 border-indigo-600 dark:border-indigo-400 font-semibold shadow-sm";
    }

    if (activeBottomBtn) {
        activeBottomBtn.className = "flex flex-col items-center justify-center flex-1 py-1 text-indigo-600 dark:text-indigo-400 transition-colors font-semibold";
    }
}

export function switchTab(tabId) {
    trackPageView(`sub_${tabId}`);

    const tabs = [
        { id: 'bg-remover' },
        { id: 'collage' },
        { id: 'converter' },
        { id: 'enhancer' }
    ];

    tabs.forEach(tab => {
        const section = document.getElementById(`section-${tab.id}`);
        const btn = document.getElementById(`tab-${tab.id}`);

        if (section) section.classList.add('hidden');
        if (btn) {
            btn.className = "px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-800 flex flex-col items-center group";
        }
    });

    const activeSection = document.getElementById(`section-${tabId}`);
    const activeBtn = document.getElementById(`tab-${tabId}`);

    if (activeSection) activeSection.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 bg-indigo-600 text-white shadow-md shadow-indigo-500/20 flex flex-col items-center group";
    }
}

// 动态渲染外链列表
function sanitizeSafeUrl(url) {
    if (!url || typeof url !== 'string') return '#';
    try {
        const parsed = new URL(url, window.location.origin);
        if (['http:', 'https:'].includes(parsed.protocol)) {
            return parsed.href;
        }
    } catch (e) {}
    return '#';
}

function sanitizeIconClass(iconClass) {
    if (!iconClass || typeof iconClass !== 'string') return 'fa-link';
    const clean = iconClass.trim();
    return /^[a-zA-Z0-9_-]+$/.test(clean) ? clean : 'fa-link';
}

async function renderLinks() {
    const container = document.getElementById('dynamic-links-container');
    if (!container) return;

    const { data: links } = await fetchLinks();
    const currentLang = getLocale() || 'zh-CN';

    const getI18nText = (baseText, i18nMap) => {
        if (i18nMap && typeof i18nMap === 'object' && i18nMap[currentLang]) {
            return i18nMap[currentLang];
        }
        return baseText || '';
    };

    container.innerHTML = '';
    (links || []).forEach(link => {
        const title = getI18nText(link.title, link.title_i18n);
        const desc = getI18nText(link.description, link.desc_i18n);
        const iconClass = sanitizeIconClass(link.icon_class);
        const safeUrl = sanitizeSafeUrl(link.url);

        const a = document.createElement('a');
        a.href = safeUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'dynamic-link-item flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all group';
        if (link.id) a.setAttribute('data-link-id', link.id);

        const iconWrap = document.createElement('div');
        iconWrap.className = 'w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform';
        const i = document.createElement('i');
        i.className = `fas ${iconClass} text-base`;
        iconWrap.appendChild(i);

        const textWrap = document.createElement('div');
        textWrap.className = 'min-w-0';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'text-xs font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate';
        titleDiv.textContent = title;

        const descDiv = document.createElement('div');
        descDiv.className = 'text-[10px] text-gray-400 dark:text-gray-500 truncate';
        descDiv.textContent = desc;

        textWrap.appendChild(titleDiv);
        textWrap.appendChild(descDiv);

        a.appendChild(iconWrap);
        a.appendChild(textWrap);

        a.addEventListener('click', () => {
            if (link.id) {
                trackLinkClick(link.id);
            }
        });

        container.appendChild(a);
    });
}

// 绑定语言选择器 (支持桌面侧边栏与移动端顶部双选择器同步)
function initLocaleSelector(availableLocales) {
    const desktopSelector = document.getElementById('localeSelect');
    const mobileSelector = document.getElementById('mobileLocaleSelect');
    
    const localeNamesDesktop = {
        'zh-CN': '🇨🇳 简体中文',
        'en-US': '🇺🇸 English'
    };
    const localeNamesMobile = {
        'zh-CN': '🇨🇳 中文',
        'en-US': '🇺🇸 EN'
    };

    const populate = (sel, nameMap) => {
        if (!sel) return;
        sel.innerHTML = availableLocales.map(loc => {
            const name = nameMap[loc] || loc;
            return `<option value="${loc}">${name}</option>`;
        }).join('');
        sel.value = getLocale();
        sel.addEventListener('change', async (e) => {
            const newLang = e.target.value;
            if (desktopSelector) desktopSelector.value = newLang;
            if (mobileSelector) mobileSelector.value = newLang;
            await setLocale(newLang);
            renderLinks();
        });
    };

    populate(desktopSelector, localeNamesDesktop);
    populate(mobileSelector, localeNamesMobile);

    window.addEventListener('locale-changed', (e) => {
        const lang = e.detail?.locale || getLocale();
        if (desktopSelector) desktopSelector.value = lang;
        if (mobileSelector) mobileSelector.value = lang;
    });
}

// 绑定到 window 以维持 HTML 内联事件兼容性
window.switchGlobalTab = switchGlobalTab;
window.switchTab = switchTab;
window.switchPdfTab = switchPdfTab;
window.switchOrganizeSubMode = switchOrganizeSubMode;
window.switchConvertSubMode = switchConvertSubMode;
window.switchSecuritySubMode = switchSecuritySubMode;
window.changeLanguage = async function(lang) {
    await setLocale(lang);
    renderLinks();
};
window.userLogout = async function() {
    await logout();
    showToast('已安全退出登录');
};

window.toggleUserDropdown = function(force) {
    const card = document.getElementById('topUserDropdownCard');
    if (!card) return;
    if (typeof force === 'boolean') {
        if (force) card.classList.remove('hidden');
        else card.classList.add('hidden');
    } else {
        card.classList.toggle('hidden');
    }
};

// 点击页面其他区域自动关闭头像下拉框
document.addEventListener('click', (e) => {
    const wrap = document.getElementById('topDesktopUserWrap');
    if (wrap && !wrap.contains(e.target)) {
        window.toggleUserDropdown(false);
    }
});

function updateUserUI(user) {
    const topGuestView = document.getElementById('topDesktopGuestView');
    const topUserView = document.getElementById('topDesktopUserView');
    const topAvatarText = document.getElementById('topUserAvatarText');
    const dropdownAvatar = document.getElementById('dropdownUserAvatar');
    const dropdownName = document.getElementById('dropdownUserName');
    const dropdownEmail = document.getElementById('dropdownUserEmail');

    const mobileGuestBtn = document.getElementById('mobileGuestLoginBtn');
    const mobileUserBadge = document.getElementById('mobileUserBadge');

    if (user) {
        // 桌面端右上角
        if (topGuestView) topGuestView.classList.add('hidden');
        if (topUserView) topUserView.classList.remove('hidden');
        
        const initial = (user.username || user.email || 'U')[0].toUpperCase();
        if (topAvatarText) topAvatarText.textContent = initial;
        if (dropdownAvatar) dropdownAvatar.textContent = initial;
        if (dropdownName) dropdownName.textContent = user.username || user.email;
        if (dropdownEmail) dropdownEmail.textContent = user.email;

        // 移动端
        if (mobileGuestBtn) mobileGuestBtn.classList.add('hidden');
        if (mobileUserBadge) mobileUserBadge.classList.remove('hidden');
        refreshBalance();
    } else {
        // 桌面端右上角
        if (topGuestView) topGuestView.classList.remove('hidden');
        if (topUserView) topUserView.classList.add('hidden');
        window.toggleUserDropdown(false);

        // 移动端
        if (mobileGuestBtn) mobileGuestBtn.classList.remove('hidden');
        if (mobileUserBadge) mobileUserBadge.classList.add('hidden');
    }
}


function initUserAuthForms() {
    const loginForm = document.getElementById('userLoginForm');
    const regForm = document.getElementById('userRegisterForm');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmailInput').value;
            const pwd = document.getElementById('loginPasswordInput').value;
            const btn = document.getElementById('loginSubmitBtn');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 登录中...`;
            try {
                const user = await login(email, pwd);
                closeAuthModal();
                showToast(`欢迎回来，${user.username}！`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('regUsernameInput').value;
            const email = document.getElementById('regEmailInput').value;
            const pwd = document.getElementById('regPasswordInput').value;
            const btn = document.getElementById('regSubmitBtn');
            const orig = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 注册中...`;
            try {
                await register(username, email, pwd);
                showToast('🎉 注册成功！正在为您自动登录...', 'success');
                const user = await login(email, pwd);
                closeAuthModal();
                showToast(`🎉 欢迎，${user.username}！已赠送 50 点算力`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = orig;
            }
        });
    }

    window.addEventListener('auth-state-changed', (e) => {
        updateUserUI(e.detail?.user);
    });
}

// 统一错误边界加载初始化
function safeInit(moduleName, initFn) {
    try {
        initFn();
        console.log(`[Main] Module "${moduleName}" initialized successfully.`);
    } catch (err) {
        console.error(`[Main] Error initializing module "${moduleName}":`, err);
        showToast(`⚠️ 模块 ${moduleName} 初始化异常，其他模块已正常加载！`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // 0. 短链直达跳转拦截 (处理 Nginx 降级至 index.html 的情况，实现毫秒级快速自动跳转)
    const shortPathMatch = window.location.pathname.match(/^\/s\/([a-zA-Z0-9_-]+)/);
    if (shortPathMatch && shortPathMatch[1]) {
        const code = shortPathMatch[1];
        document.body.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#f8fafc;">
                <div style="width:36px;height:36px;border:3px solid rgba(99,102,241,0.2);border-top-color:#6366f1;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
                <p style="margin-top:16px;font-size:14px;color:#cbd5e1;font-weight:500;">正在安全跳转至目标网址...</p>
                <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
            </div>
        `;
        try {
            const resp = await fetch(`/api/v1/tools/shortlink/resolve/${encodeURIComponent(code)}`);
            if (resp.ok) {
                const data = await resp.json();
                if (data && data.original_url) {
                    window.location.replace(data.original_url);
                    return;
                }
            }
        } catch (e) {}
        window.location.replace('/?err=shortlink_not_found');
        return;
    }

    // 1. 初始化主题设置
    safeInit('Theme', initTheme);

    // 2. 从配置服务获取全局配置并初始化 i18n
    const { data: config } = await fetchSiteConfig();
    await initI18n(config.available_locales, config.default_locale);
    initLocaleSelector(getAvailableLocales());

    // 3. 渲染动态推荐外链与广告
    renderLinks();
    window.addEventListener('locale-changed', () => {
        renderLinks();
    });
    
    // 4. 初始化用户认证与静默刷新 (Phase 2a)
    initUserAuthForms();
    tryRefresh(); // 页面打开时通过 HttpOnly Cookie 静默换票

    // 5. 初始化各个深度子功能模块
    safeInit('Background Remover', initBgRemover);
    safeInit('Collage Layout', initCollage);
    safeInit('Batch Converter', initConverter);
    safeInit('Image Enhancer', initEnhancer);
    safeInit('ONNX OCR', initOcr);
    safeInit('PDF Tools Studio', initPdfTools);
    safeInit('QR Code Styling', initQrCode);
    safeInit('Short Link API', initShortLink);
    safeInit('Ad Banners Manager', initAdManager);
    
    // 6. 设置默认显示页签
    switchGlobalTab('image-station');
    switchTab('bg-remover');
    
    console.log("[Main] Super Toolbox Pro initialization complete.");
});


