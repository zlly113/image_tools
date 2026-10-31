import { initTheme, showToast } from './utils.js';
import { initBgRemover } from './bgRemover.js';
import { initCollage } from './collage.js';
import { initConverter } from './converter.js';
import { initEnhancer } from './enhancer.js';
import { initOcr } from './ocr.js';
import { initPdfTools, switchPdfTab, switchOrganizeSubMode, switchConvertSubMode, switchSecuritySubMode } from './pdfTools.js';
import { initQrCode, getQrCodeInstance, setQrCodeInstance, switchLinkToolTab, switchQRSubTab, regenerateQRCode } from './qrCode.js';
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
            navBtn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors";
        }
        if (bottomBtn) {
            bottomBtn.className = "flex flex-col items-center justify-center flex-1 py-1.5 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors";
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
        activeNavBtn.className = "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-200/70 dark:bg-zinc-800 transition-colors shadow-xs";
    }

    if (activeBottomBtn) {
        activeBottomBtn.className = "flex flex-col items-center justify-center flex-1 py-1.5 text-zinc-900 dark:text-zinc-100 font-semibold transition-colors";
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
            btn.className = "px-3.5 py-1.5 rounded-lg font-medium text-xs md:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1.5";
        }
    });

    const activeSection = document.getElementById(`section-${tabId}`);
    const activeBtn = document.getElementById(`tab-${tabId}`);

    if (activeSection) activeSection.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-3.5 py-1.5 rounded-lg font-semibold text-xs md:text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors flex items-center gap-1.5";
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
    // 0. 短链历史访问保护：若有人访问已下线的 /s/*，安全重定向回首页
    if (window.location.pathname.startsWith('/s/')) {
        window.location.replace('/');
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

    // 5. 初始化各个深度子功能模块 (全站 100% 纯本地运行)
    safeInit('Background Remover', initBgRemover);
    safeInit('Collage Layout', initCollage);
    safeInit('Batch Converter', initConverter);
    safeInit('Image Enhancer', initEnhancer);
    safeInit('ONNX OCR', initOcr);
    safeInit('PDF Tools Studio', initPdfTools);
    safeInit('QR Code Styling', initQrCode);
    safeInit('Ad Banners Manager', initAdManager);
    
    // 6. 设置默认显示页签
    switchGlobalTab('image-station');
    switchTab('bg-remover');
    
    console.log("[Main] Super Toolbox Pro initialization complete.");
});


