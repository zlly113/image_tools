// js/tracker.js
/**
 * 极简轻量、零隐私风险的前端统计埋点 SDK
 * 支持：双 ID 匿名会话追踪、SPA 虚拟 PV、功能调用质量监控、心跳与页面离开非阻塞上报
 */

const API_TRACK_URL = '/api/v1/analytics/track';

// 1. 获取或生成持久化访客 ID (localStorage, 1年有效，作为准确 UV)
function getVisitorId() {
    let vid = localStorage.getItem('__at_vid');
    if (!vid) {
        vid = 'v_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
        localStorage.setItem('__at_vid', vid);
    }
    return vid;
}

// 2. 获取或生成会话 ID (30分钟超时轮换)
function getSessionId() {
    const now = Date.now();
    const sessJson = sessionStorage.getItem('__at_sess');
    if (sessJson) {
        try {
            const sess = JSON.parse(sessJson);
            if (now - sess.lastActive < 30 * 60 * 1000) {
                sess.lastActive = now;
                sessionStorage.setItem('__at_sess', JSON.stringify(sess));
                return sess.id;
            }
        } catch(e) {}
    }
    const newSessId = 's_' + Math.random().toString(36).substring(2, 10) + now.toString(36);
    sessionStorage.setItem('__at_sess', JSON.stringify({ id: newSessId, lastActive: now }));
    return newSessId;
}

// 3. 设备与客户端特征解析
function getClientMeta() {
    const ua = navigator.userAgent;
    let device_type = 'desktop';
    if (/mobile/i.test(ua)) device_type = 'mobile';
    else if (/tablet|ipad/i.test(ua)) device_type = 'tablet';

    let os = 'Other';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Other';
    if (/edg/i.test(ua)) browser = 'Edge';
    else if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';

    return {
        device_type,
        os,
        browser,
        language: navigator.language || '',
        referrer: document.referrer || ''
    };
}

// 4. 发送事件 (优先 sendBeacon Blob, 降级 fetch)
export function sendTrack(eventType, eventName, extra = {}) {
    const meta = getClientMeta();
    const payload = {
        visitor_id: getVisitorId(),
        session_id: getSessionId(),
        event_type: eventType,
        event_name: eventName,
        status: extra.status || 'ok',
        duration_ms: extra.duration_ms || 0,
        referrer: meta.referrer,
        device_type: meta.device_type,
        os: meta.os,
        browser: meta.browser,
        language: meta.language
    };

    const dataStr = JSON.stringify(payload);

    if (navigator.sendBeacon) {
        const blob = new Blob([dataStr], { type: 'application/json' });
        navigator.sendBeacon(API_TRACK_URL, blob);
    } else {
        fetch(API_TRACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: dataStr,
            keepalive: true
        }).catch(() => {});
    }
}

// 5. 导出便捷业务方法
export function trackPageView(pageName = 'index_load') {
    sendTrack('page_view', pageName);
}

export function trackFeatureUse(featureName, status = 'ok') {
    sendTrack('feature_use', featureName, { status });
}

// 6. 全局生命周期与心跳绑定
let pageStartTime = Date.now();

// 自动上报首屏 PV
trackPageView('index_load');

// 每 30 秒上报一次心跳 (更新最后活跃状态)
setInterval(() => {
    sendTrack('heartbeat', 'active_ping');
}, 30000);

// 页面离开时上报停留时长 (page_leave)，防抖去重防止 visibilitychange 与 pagehide 同时触发翻倍
let hasSentLeave = false;

function reportPageLeave() {
    if (hasSentLeave) return;
    hasSentLeave = true;
    const duration = Math.max(0, Date.now() - pageStartTime);
    sendTrack('page_leave', 'unload', { duration_ms: duration });
}

window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        reportPageLeave();
    } else if (document.visibilityState === 'visible') {
        // 用户重新切回页面时重置离开标识与计时起点，排除后台挂起时间
        hasSentLeave = false;
        pageStartTime = Date.now();
    }
});

window.addEventListener('pagehide', () => {
    reportPageLeave();
});

// 挂载到全局 window 便于 HTML 各种事件快捷触发
window.trackFeatureUse = trackFeatureUse;
window.trackPageView = trackPageView;
