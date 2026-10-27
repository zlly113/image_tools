// js/i18n.js
// 极简高性能客户端多语言引擎 (~100行原生 JS，零依赖)

let currentLocale = 'zh-CN';
let translations = {};
let availableLocales = ['zh-CN', 'en-US'];

function getNestedValue(obj, keyPath) {
    if (!obj || !keyPath) return null;
    return keyPath.split('.').reduce((acc, part) => (acc && acc[part] !== undefined) ? acc[part] : null, obj);
}

function interpolate(template, params) {
    if (!params || typeof params !== 'object') return template;
    return template.replace(/\{(\w+)\}/g, (match, key) => (params[key] !== undefined ? params[key] : match));
}

export function t(key, params = {}) {
    const value = getNestedValue(translations, key);
    if (typeof value === 'string') {
        return interpolate(value, params);
    }
    return key; // 兜底返回 key 自身
}

export function getLocale() {
    return currentLocale;
}

export function getAvailableLocales() {
    return availableLocales;
}

export function setAvailableLocales(locales) {
    if (Array.isArray(locales) && locales.length > 0) {
        availableLocales = locales;
    }
}

export async function loadLocale(locale) {
    try {
        const response = await fetch(`/locales/${locale}.json?v=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        translations = await response.json();
    } catch (err) {
        console.warn(`[i18n] Failed to load locale file for "${locale}", using fallback.`, err);
        // 如果当前语言加载失败且不是 zh-CN，尝试降级加载 zh-CN
        if (locale !== 'zh-CN') {
            try {
                const res = await fetch(`/locales/zh-CN.json`);
                translations = await res.json();
            } catch (e) {
                translations = {};
            }
        }
    }
}

export function applyTranslations() {
    // 1. 文本内容国际化 [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        let params = {};
        const paramsAttr = el.getAttribute('data-i18n-params');
        if (paramsAttr) {
            try { params = JSON.parse(paramsAttr); } catch (e) {}
        }
        const translation = t(key, params);
        if (translation !== key) {
            if (translation.includes('<') && translation.includes('>')) {
                el.innerHTML = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    // 2. 标签属性国际化 [data-i18n-attr]
    // 格式如 data-i18n-attr='{"placeholder": "auth.email_placeholder", "title": "ads.close_title"}'
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        try {
            const attrMap = JSON.parse(el.getAttribute('data-i18n-attr'));
            for (const [attrName, key] of Object.entries(attrMap)) {
                const translation = t(key);
                if (translation !== key) {
                    el.setAttribute(attrName, translation);
                }
            }
        } catch (e) {}
    });
}

export async function setLocale(lang) {
    if (!availableLocales.includes(lang)) {
        console.warn(`[i18n] Requested locale "${lang}" is not in availableLocales. Falling back to zh-CN.`);
        lang = 'zh-CN';
    }
    currentLocale = lang;
    localStorage.setItem('user_locale', lang);
    document.documentElement.lang = lang;
    
    await loadLocale(lang);
    applyTranslations();

    // 触发全局自定义事件，方便广告、动态卡片等模块接收通知重新刷新
    window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale: lang } }));
}

export async function initI18n(initialLocales = null, defaultLocale = null) {
    if (initialLocales) {
        setAvailableLocales(initialLocales);
    }
    
    // 语言优先级: 1. LocalStorage > 2. 浏览器语言 > 3. 传入的 defaultLocale > 4. 'zh-CN'
    const saved = localStorage.getItem('user_locale');
    let targetLocale = saved;

    if (!targetLocale) {
        const browserLang = navigator.language || navigator.userLanguage || '';
        if (browserLang.startsWith('zh')) {
            targetLocale = 'zh-CN';
        } else if (browserLang.startsWith('en')) {
            targetLocale = 'en-US';
        } else {
            targetLocale = defaultLocale || 'zh-CN';
        }
    }

    if (!availableLocales.includes(targetLocale)) {
        targetLocale = availableLocales[0] || 'zh-CN';
    }

    await setLocale(targetLocale);
    console.log(`[i18n] Initialized with locale: ${targetLocale}`);
}
