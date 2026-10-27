// js/configService.js
// 动态配置与数据服务 (具备 Level 1 实时API -> Level 2 本地缓存 -> Level 3 内置硬编码 的三级降级容灾能力)

const API_BASE = '/api/v1';

// Level 3 默认内置硬编码兜底数据 (当网络完全中断且无任何本地缓存时生效)
const DEFAULT_FALLBACK_CONFIG = {
    site_name: "超级工具箱 Pro",
    site_version: "2.0.0",
    announcement: "欢迎使用超级工具箱 Pro！所有图片与数据完全本地处理，安全高效。",
    announcement_i18n: {
        "zh-CN": "欢迎使用超级工具箱 Pro！所有图片与数据完全本地处理，安全高效。",
        "en-US": "Welcome to Super Toolbox Pro! Local processing, 100% private and efficient."
    },
    announcement_active: false,
    maintenance_mode: false,
    default_locale: "zh-CN",
    available_locales: ["zh-CN", "en-US"],
    features: {
        ocr_enabled: true,
        shortlink_enabled: true,
        ai_tools_enabled: false
    }
};

const DEFAULT_FALLBACK_ADS = [
    {
        id: 1,
        slot_id: "top-banner",
        title: "🚀 本站黄金广告位招商中",
        title_i18n: {
            "zh-CN": "🚀 本站黄金广告位招商中",
            "en-US": "🚀 Premium Ad Spot Available"
        },
        description: "获取海量精准曝光，点击联系客服微信洽谈合作",
        desc_i18n: {
            "zh-CN": "获取海量精准曝光，点击联系客服微信洽谈合作",
            "en-US": "Reach massive targeted traffic. Click to contact us."
        },
        link_url: "javascript:void(0);",
        image_url: "",
        action_type: "wechat",
        wechat_id: "duobaoerbao",
        format: "banner",
        is_active: true
    },
    {
        id: 2,
        slot_id: "sidebar-ad",
        title: "多宝美优品",
        title_i18n: {
            "zh-CN": "多宝美优品",
            "en-US": "DuoBao Premium Store"
        },
        description: "海淘直邮代购 · 正品保障",
        desc_i18n: {
            "zh-CN": "海淘直邮代购 · 正品保障",
            "en-US": "Direct Import & Quality Guaranteed"
        },
        link_url: "https://myp.hhdzai.top",
        image_url: "",
        action_type: "link",
        wechat_id: "",
        format: "square",
        is_active: true
    }
];

const DEFAULT_FALLBACK_LINKS = [
    {
        id: 1,
        category: "tool",
        title: "打字练习",
        title_i18n: { "zh-CN": "打字练习", "en-US": "Typing Practice" },
        description: "在线打字指法训练",
        desc_i18n: { "zh-CN": "在线打字指法训练", "en-US": "Online typing practice" },
        url: "https://dazi.229118.xyz/",
        icon_class: "fa-keyboard"
    },
    {
        id: 2,
        category: "tool",
        title: "IT工具箱",
        title_i18n: { "zh-CN": "IT工具箱", "en-US": "IT Tools" },
        description: "开发者极客全能工具",
        desc_i18n: { "zh-CN": "开发者极客全能工具", "en-US": "Developer Swiss-knife tools" },
        url: "https://ittools.229118.xyz/",
        icon_class: "fa-tools"
    },
    {
        id: 3,
        category: "tool",
        title: "PDF工具",
        title_i18n: { "zh-CN": "PDF工具", "en-US": "PDF Tools" },
        description: "PDF合并分割与转换",
        desc_i18n: { "zh-CN": "PDF合并分割与转换", "en-US": "PDF merge, split & convert" },
        url: "https://pdf.229118.xyz/",
        icon_class: "fa-file-pdf"
    },
    {
        id: 4,
        category: "tool",
        title: "DOS老游戏",
        title_i18n: { "zh-CN": "DOS老游戏", "en-US": "DOS Games" },
        description: "怀旧经典网页游戏",
        desc_i18n: { "zh-CN": "怀旧经典网页游戏", "en-US": "Classic nostalgic web games" },
        url: "https://dosgame.229118.xyz/",
        icon_class: "fa-gamepad"
    }
];

export async function fetchSiteConfig() {
    // Level 1: 请求 API
    try {
        const res = await fetch(`${API_BASE}/config`);
        if (res.ok) {
            const data = await res.json();
            // 写入本地缓存 (Level 2)
            localStorage.setItem('cache_site_config', JSON.stringify(data));
            return { data, source: 'network' };
        }
    } catch (e) {
        console.warn("[ConfigService] API /config unreachable, falling back to cache.", e);
    }

    // Level 2: 读缓存
    try {
        const cached = localStorage.getItem('cache_site_config');
        if (cached) {
            return { data: JSON.parse(cached), source: 'cache' };
        }
    } catch (e) {}

    // Level 3: 硬编码兜底
    return { data: DEFAULT_FALLBACK_CONFIG, source: 'fallback' };
}

export async function fetchAds(slotId = null) {
    // Level 1: 请求 API
    try {
        let url = `${API_BASE}/ads`;
        if (slotId) url += `?slot_id=${encodeURIComponent(slotId)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(`cache_ads_${slotId || 'all'}`, JSON.stringify(data));
            return { data, source: 'network' };
        }
    } catch (e) {
        console.warn(`[ConfigService] API /ads unreachable for slot=${slotId}, falling back to cache.`, e);
    }

    // Level 2: 读缓存
    try {
        const cached = localStorage.getItem(`cache_ads_${slotId || 'all'}`);
        if (cached) {
            return { data: JSON.parse(cached), source: 'cache' };
        }
    } catch (e) {}

    // Level 3: 硬编码兜底
    const filtered = slotId 
        ? DEFAULT_FALLBACK_ADS.filter(ad => ad.slot_id === slotId)
        : DEFAULT_FALLBACK_ADS;
    return { data: filtered, source: 'fallback' };
}

export async function fetchLinks(category = null) {
    // Level 1: 请求 API
    try {
        let url = `${API_BASE}/links`;
        if (category) url += `?category=${encodeURIComponent(category)}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(`cache_links_${category || 'all'}`, JSON.stringify(data));
            return { data, source: 'network' };
        }
    } catch (e) {
        console.warn(`[ConfigService] API /links unreachable for cat=${category}, falling back to cache.`, e);
    }

    // Level 2: 读缓存
    try {
        const cached = localStorage.getItem(`cache_links_${category || 'all'}`);
        if (cached) {
            return { data: JSON.parse(cached), source: 'cache' };
        }
    } catch (e) {}

    // Level 3: 硬编码兜底
    const filtered = category
        ? DEFAULT_FALLBACK_LINKS.filter(link => link.category === category)
        : DEFAULT_FALLBACK_LINKS;
    return { data: filtered, source: 'fallback' };
}

export async function trackAdClick(adId) {
    if (!adId) return;
    try {
        await fetch(`${API_BASE}/ads/${adId}/click`, { method: 'POST' });
    } catch (e) {}
}

export async function trackAdClose(adId) {
    if (!adId) return;
    try {
        await fetch(`${API_BASE}/ads/${adId}/close`, { method: 'POST' });
    } catch (e) {}
}

export async function trackLinkClick(linkId) {
    if (!linkId) return;
    try {
        await fetch(`${API_BASE}/links/${linkId}/click`, { method: 'POST' });
    } catch (e) {}
}
