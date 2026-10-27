// admin/js/adminApp.js
import { getAdminToken, setAdminToken, clearAdminToken, adminLogout, isAuthenticated, adminFetch, adminLoginWithPassword } from './adminAuth.js';

const API_BASE = '/api/v1';

// 安全防护：HTML 实体转义函数，防御 Stored XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 页面状态管理
let currentTab = 'analytics';
let rawConfigs = [];
let adsList = [];
let linksList = [];
let trendChartInstance = null;
let featuresChartInstance = null;
let devicesChartInstance = null;
let analyticsRefreshTimer = null;

// DOM 元素引用
const authModal = document.getElementById('authModal');
const mainContent = document.getElementById('mainContent');
const tokenInput = document.getElementById('tokenInput');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');

// 通知提示
function toast(msg, type = 'info') {
    const el = document.createElement('div');
    const color = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-indigo-600';
    el.className = `fixed bottom-6 right-6 z-50 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium transition-all transform translate-y-2 opacity-0 ${color}`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
        el.classList.remove('translate-y-2', 'opacity-0');
    }, 10);
    setTimeout(() => {
        el.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => el.remove(), 300);
    }, 2500);
}

// 检查认证状态
function checkAuth() {
    if (!isAuthenticated()) {
        authModal.classList.remove('hidden');
        mainContent.classList.add('hidden');
        if (analyticsRefreshTimer) clearInterval(analyticsRefreshTimer);
    } else {
        authModal.classList.add('hidden');
        mainContent.classList.remove('hidden');
        loadCurrentTab();
        if (!analyticsRefreshTimer) {
            analyticsRefreshTimer = setInterval(() => {
                if (currentTab === 'analytics' && isAuthenticated()) {
                    loadAnalytics();
                }
            }, 60000);
        }
    }
}

// 登录模式切换
window.switchAdminAuthMode = function(mode) {
    const tabAccount = document.getElementById('authTabAccountBtn');
    const tabToken = document.getElementById('authTabTokenBtn');
    const formAccount = document.getElementById('adminAccountForm');
    const formToken = document.getElementById('adminTokenForm');

    if (!tabAccount || !tabToken || !formAccount || !formToken) return;

    if (mode === 'account') {
        tabAccount.className = "flex-1 pb-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400";
        tabToken.className = "flex-1 pb-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 border-b-2 border-transparent";
        formAccount.classList.remove('hidden');
        formToken.classList.add('hidden');
    } else {
        tabToken.className = "flex-1 pb-2.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400";
        tabAccount.className = "flex-1 pb-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 border-b-2 border-transparent";
        formToken.classList.remove('hidden');
        formAccount.classList.add('hidden');
    }
};

// 1. 账号密码登录
const adminAccountForm = document.getElementById('adminAccountForm');
if (adminAccountForm) {
    adminAccountForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmailInput')?.value.trim();
        const pwd = document.getElementById('adminPasswordInput')?.value;
        const btn = document.getElementById('adminAccountSubmitBtn');
        const orig = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> 登录中...`;
        try {
            const user = await adminLoginWithPassword(email, pwd);
            toast(`欢迎管理员 ${user.username}！`, 'success');
            checkAuth();
        } catch (err) {
            toast(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = orig;
        }
    });
}

// 2. 静态 Secret Token 登录
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token) {
            toast('请输入 Admin Token', 'error');
            return;
        }
        setAdminToken(token);
        try {
            const res = await adminFetch(`${API_BASE}/config/raw`);
            if (res.ok) {
                toast('Token 验证成功！', 'success');
                checkAuth();
            } else {
                clearAdminToken();
                toast('Token 错误，请重试', 'error');
            }
        } catch (e) {
            toast(e.message || '验证失败', 'error');
        }
    });
}

logoutBtn.addEventListener('click', async () => {
    await adminLogout();
    checkAuth();
    toast('已安全退出后台并吊销登录凭据', 'info');
});

window.addEventListener('admin-unauthorized', () => {
    checkAuth();
    toast('登录已过期，请重新输入 Token', 'error');
});

// 标签切换
window.switchAdminTab = function(tabName) {
    currentTab = tabName;
    ['analytics', 'ads', 'links', 'users', 'pricing', 'config'].forEach(t => {
        const btn = document.getElementById(`tabBtn-${t}`);
        const panel = document.getElementById(`panel-${t}`);
        if (btn && panel) {
            if (t === tabName) {
                btn.className = "px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 flex items-center gap-2";
                panel.classList.remove('hidden');
            } else {
                btn.className = "px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 border-b-2 border-transparent flex items-center gap-2";
                panel.classList.add('hidden');
            }
        }
    });
    loadCurrentTab();
};

async function loadCurrentTab() {
    if (currentTab === 'analytics') await loadAnalytics();
    else if (currentTab === 'ads') await loadAds();
    else if (currentTab === 'links') await loadLinks();
    else if (currentTab === 'users') await loadUsers();
    else if (currentTab === 'pricing') await loadPricing();
    else if (currentTab === 'config') await loadConfigs();
}

// ======================= 0. 数据统计分析面板 =======================

async function loadAnalytics() {
    try {
        const res = await adminFetch(`${API_BASE}/analytics/overview?days=30`);
        if (!res.ok) throw new Error('获取数据失败');
        const data = await res.json();
        renderAnalytics(data);
    } catch (e) {
        toast('加载统计数据失败: ' + e.message, 'error');
    }
}

function renderAnalytics(data) {
    const { today, total_pv, total_uv, trend, features, devices } = data;

    // 1. KPI 赋值
    document.getElementById('statTodayPv').textContent = today.pv || 0;
    document.getElementById('statTotalPv').textContent = total_pv || 0;
    document.getElementById('statTodayUv').textContent = today.uv || 0;
    document.getElementById('statTotalUv').textContent = total_uv || 0;
    document.getElementById('statTodayIp').textContent = today.ip_count || 0;
    document.getElementById('statTodayBounce').textContent = today.bounce_count || 0;

    let featureTotalSum = 0;
    Object.values(features || {}).forEach(item => { featureTotalSum += item.total || 0; });
    document.getElementById('statTotalFeatures').textContent = featureTotalSum;

    if (typeof Chart === 'undefined') return;

    // 2. 渲染 PV & UV 趋势折线图
    const trendCtx = document.getElementById('trendChart')?.getContext('2d');
    if (trendCtx) {
        if (trendChartInstance) trendChartInstance.destroy();
        const labels = (trend || []).map(t => t.stat_date.substring(5)); // 'MM-DD'
        const pvData = (trend || []).map(t => t.pv);
        const uvData = (trend || []).map(t => t.uv);

        trendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: labels.length ? labels : ['今日'],
                datasets: [
                    {
                        label: 'PV (浏览量)',
                        data: pvData.length ? pvData : [today.pv || 0],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        tension: 0.35,
                        fill: true
                    },
                    {
                        label: 'UV (独立访客)',
                        data: uvData.length ? uvData : [today.uv || 0],
                        borderColor: '#10b981',
                        backgroundColor: 'transparent',
                        borderDash: [4, 4],
                        tension: 0.35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 3. 渲染功能排行榜柱状图
    const featCtx = document.getElementById('featuresChart')?.getContext('2d');
    if (featCtx) {
        if (featuresChartInstance) featuresChartInstance.destroy();
        const featNamesMap = {
            'bg_remover_export': '证件照保存',
            'collage_export': '拼图导出',
            'converter_export': '批量格式转换',
            'enhancer_export': '滤镜高清保存',
            'qr_generate': '二维码生成',
            'qr_decode': '二维码识别',
            'shortlink_generate': '短链接生成',
            'ocr_recognize': 'OCR文字识别',
            'ocr_export': 'OCR导出'
        };

        const sortedFeats = Object.entries(features || {}).sort((a, b) => b[1].total - a[1].total).slice(0, 6);
        const featLabels = sortedFeats.map(([k]) => featNamesMap[k] || k);
        const featCounts = sortedFeats.map(([, v]) => v.total);

        featuresChartInstance = new Chart(featCtx, {
            type: 'bar',
            data: {
                labels: featLabels.length ? featLabels : ['暂无调用'],
                datasets: [{
                    label: '使用次数',
                    data: featCounts.length ? featCounts : [0],
                    backgroundColor: 'rgba(245, 158, 11, 0.85)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(156, 163, 175, 0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    // 4. 渲染设备分布环形图
    const devCtx = document.getElementById('devicesChart')?.getContext('2d');
    if (devCtx) {
        if (devicesChartInstance) devicesChartInstance.destroy();
        const devLabels = ['桌面电脑', '手机移动端', '平板设备'];
        const devData = [devices?.desktop || 0, devices?.mobile || 0, devices?.tablet || 0];

        devicesChartInstance = new Chart(devCtx, {
            type: 'doughnut',
            data: {
                labels: devLabels,
                datasets: [{
                    data: (devData[0] + devData[1] + devData[2]) === 0 ? [1, 0, 0] : devData,
                    backgroundColor: ['#6366f1', '#14b8a6', '#f43f5e']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
}

// ======================= 1. 广告管理面板 =======================

async function loadAds() {
    try {
        const res = await adminFetch(`${API_BASE}/ads/admin/all`);
        adsList = await res.json();
        renderAdsTable();
    } catch (e) {
        toast('加载广告数据失败: ' + e.message, 'error');
    }
}

function renderAdsTable() {
    const tbody = document.getElementById('adsTableBody');
    if (!tbody) return;
    if (!adsList.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400 text-sm">暂无广告数据</td></tr>`;
        return;
    }
    tbody.innerHTML = adsList.map(ad => `
        <tr class="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <td class="py-3 px-4 text-xs font-mono text-gray-500">${ad.id}</td>
            <td class="py-3 px-4 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <span class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono">${escapeHtml(ad.slot_id)}</span>
            </td>
            <td class="py-3 px-4 text-xs font-medium text-gray-900 dark:text-white">
                <div>${escapeHtml(ad.title)}</div>
                <div class="text-[10px] text-gray-400 font-normal mt-0.5">EN: ${escapeHtml(ad.title_i18n?.['en-US'] || '-')}</div>
            </td>
            <td class="py-3 px-4 text-xs text-gray-500">
                <span class="px-2 py-0.5 rounded text-[11px] font-mono bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">${escapeHtml(ad.action_type || 'link')}</span>
            </td>
            <td class="py-3 px-4 text-xs font-mono text-gray-500">
                点击: <span class="font-semibold text-indigo-600">${Number(ad.click_count) || 0}</span> / 关闭: ${Number(ad.close_count) || 0}
            </td>
            <td class="py-3 px-4 text-xs">
                <button onclick="toggleAdStatus(${ad.id})" class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${ad.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}">
                    ${ad.is_active ? '● 生效中' : '○ 已停用'}
                </button>
            </td>
            <td class="py-3 px-4 text-xs text-right space-x-2">
                <button onclick="editAd(${ad.id})" class="text-indigo-600 hover:text-indigo-800 font-medium">编辑</button>
                <button onclick="deleteAd(${ad.id})" class="text-rose-600 hover:text-rose-800 font-medium">删除</button>
            </td>
        </tr>
    `).join('');
}

window.toggleAdStatus = async function(id) {
    try {
        const res = await adminFetch(`${API_BASE}/ads/${id}/toggle`, { method: 'PATCH' });
        if (res.ok) {
            toast('状态切换成功', 'success');
            await loadAds();
        }
    } catch (e) { toast(e.message, 'error'); }
};

window.deleteAd = async function(id) {
    if (!confirm(`确定要删除广告 ID=${id} 吗？此操作不可逆。`)) return;
    try {
        const res = await adminFetch(`${API_BASE}/ads/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast('广告已删除', 'success');
            await loadAds();
        }
    } catch (e) { toast(e.message, 'error'); }
};

window.showCreateAdModal = function() {
    document.getElementById('adModalTitle').textContent = '新建广告';
    document.getElementById('adForm').reset();
    document.getElementById('adIdInput').value = '';
    document.getElementById('adModal').classList.remove('hidden');
};

window.editAd = function(id) {
    const ad = adsList.find(a => a.id === id);
    if (!ad) return;
    document.getElementById('adModalTitle').textContent = '编辑广告 ID: ' + id;
    document.getElementById('adIdInput').value = ad.id;
    document.getElementById('adSlotInput').value = ad.slot_id;
    document.getElementById('adTitleZh').value = ad.title_i18n?.['zh-CN'] || ad.title;
    document.getElementById('adTitleEn').value = ad.title_i18n?.['en-US'] || '';
    document.getElementById('adDescZh').value = ad.desc_i18n?.['zh-CN'] || ad.description;
    document.getElementById('adDescEn').value = ad.desc_i18n?.['en-US'] || '';
    document.getElementById('adLinkUrl').value = ad.link_url;
    document.getElementById('adImageUrl').value = ad.image_url;
    document.getElementById('adActionType').value = ad.action_type || 'link';
    document.getElementById('adWechatId').value = ad.wechat_id || '';
    document.getElementById('adFormat').value = ad.format || 'banner';
    document.getElementById('adSortOrder').value = ad.sort_order || 0;
    document.getElementById('adModal').classList.remove('hidden');
};

window.closeAdModal = function() {
    document.getElementById('adModal').classList.add('hidden');
};

document.getElementById('adForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('adIdInput').value;
    const slot_id = document.getElementById('adSlotInput').value.trim();
    const titleZh = document.getElementById('adTitleZh').value.trim();
    const titleEn = document.getElementById('adTitleEn').value.trim();
    const descZh = document.getElementById('adDescZh').value.trim();
    const descEn = document.getElementById('adDescEn').value.trim();
    const link_url = document.getElementById('adLinkUrl').value.trim();
    const image_url = document.getElementById('adImageUrl').value.trim();
    const action_type = document.getElementById('adActionType').value;
    const wechat_id = document.getElementById('adWechatId').value.trim();
    const format = document.getElementById('adFormat').value;
    const sort_order = parseInt(document.getElementById('adSortOrder').value) || 0;

    const payload = {
        slot_id,
        title: titleZh,
        title_i18n: { "zh-CN": titleZh, "en-US": titleEn },
        description: descZh,
        desc_i18n: { "zh-CN": descZh, "en-US": descEn },
        link_url,
        image_url,
        action_type,
        wechat_id,
        format,
        sort_order,
        is_active: true
    };

    try {
        let res;
        if (id) {
            res = await adminFetch(`${API_BASE}/ads/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            res = await adminFetch(`${API_BASE}/ads`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        if (res.ok) {
            toast(id ? '广告已更新' : '广告创建成功', 'success');
            closeAdModal();
            await loadAds();
        }
    } catch (err) { toast(err.message, 'error'); }
});

// ======================= 2. 外链管理面板 =======================

async function loadLinks() {
    try {
        const res = await adminFetch(`${API_BASE}/links/admin/all`);
        linksList = await res.json();
        renderLinksTable();
    } catch (e) {
        toast('加载外链失败: ' + e.message, 'error');
    }
}

function renderLinksTable() {
    const tbody = document.getElementById('linksTableBody');
    if (!tbody) return;
    if (!linksList.length) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-400 text-sm">暂无外链数据</td></tr>`;
        return;
    }
    tbody.innerHTML = linksList.map(link => `
        <tr class="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <td class="py-3 px-4 text-xs font-mono text-gray-500">${link.id}</td>
            <td class="py-3 px-4 text-xs font-semibold text-gray-800 dark:text-gray-200">
                <span class="px-2 py-0.5 rounded bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono">${escapeHtml(link.category)}</span>
            </td>
            <td class="py-3 px-4 text-xs font-medium text-gray-900 dark:text-white">
                <div class="flex items-center gap-2">
                    <i class="fas ${escapeHtml(link.icon_class || 'fa-link')} text-indigo-500 text-sm"></i>
                    <span>${escapeHtml(link.title)}</span>
                </div>
                <div class="text-[10px] text-gray-400 font-normal mt-0.5">${escapeHtml(link.description)} (EN: ${escapeHtml(link.title_i18n?.['en-US'] || '-')})</div>
            </td>
            <td class="py-3 px-4 text-xs font-mono text-gray-500">
                <a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="hover:underline text-indigo-600 truncate max-w-xs block">${escapeHtml(link.url)}</a>
            </td>
            <td class="py-3 px-4 text-xs">
                <button onclick="toggleLinkStatus(${link.id})" class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${link.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'}">
                    ${link.is_active ? '● 显示中' : '○ 已隐藏'}
                </button>
            </td>
            <td class="py-3 px-4 text-xs text-right space-x-2">
                <button onclick="editLink(${link.id})" class="text-indigo-600 hover:text-indigo-800 font-medium">编辑</button>
                <button onclick="deleteLink(${link.id})" class="text-rose-600 hover:text-rose-800 font-medium">删除</button>
            </td>
        </tr>
    `).join('');
}

window.toggleLinkStatus = async function(id) {
    try {
        const res = await adminFetch(`${API_BASE}/links/${id}/toggle`, { method: 'PATCH' });
        if (res.ok) {
            toast('状态更新成功', 'success');
            await loadLinks();
        }
    } catch (e) { toast(e.message, 'error'); }
};

window.deleteLink = async function(id) {
    if (!confirm(`确定删除外链 ID=${id} 吗？`)) return;
    try {
        const res = await adminFetch(`${API_BASE}/links/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast('外链已删除', 'success');
            await loadLinks();
        }
    } catch (e) { toast(e.message, 'error'); }
};

window.showCreateLinkModal = function() {
    document.getElementById('linkModalTitle').textContent = '新建外链';
    document.getElementById('linkForm').reset();
    document.getElementById('linkIdInput').value = '';
    document.getElementById('linkModal').classList.remove('hidden');
};

window.editLink = function(id) {
    const link = linksList.find(l => l.id === id);
    if (!link) return;
    document.getElementById('linkModalTitle').textContent = '编辑外链 ID: ' + id;
    document.getElementById('linkIdInput').value = link.id;
    document.getElementById('linkCategory').value = link.category;
    document.getElementById('linkTitleZh').value = link.title_i18n?.['zh-CN'] || link.title;
    document.getElementById('linkTitleEn').value = link.title_i18n?.['en-US'] || '';
    document.getElementById('linkDescZh').value = link.desc_i18n?.['zh-CN'] || link.description;
    document.getElementById('linkDescEn').value = link.desc_i18n?.['en-US'] || '';
    document.getElementById('linkUrl').value = link.url;
    document.getElementById('linkIconClass').value = link.icon_class || 'fa-link';
    document.getElementById('linkSortOrder').value = link.sort_order || 0;
    document.getElementById('linkModal').classList.remove('hidden');
};

window.closeLinkModal = function() {
    document.getElementById('linkModal').classList.add('hidden');
};

document.getElementById('linkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('linkIdInput').value;
    const category = document.getElementById('linkCategory').value;
    const titleZh = document.getElementById('linkTitleZh').value.trim();
    const titleEn = document.getElementById('linkTitleEn').value.trim();
    const descZh = document.getElementById('linkDescZh').value.trim();
    const descEn = document.getElementById('linkDescEn').value.trim();
    const url = document.getElementById('linkUrl').value.trim();
    const icon_class = document.getElementById('linkIconClass').value.trim();
    const sort_order = parseInt(document.getElementById('linkSortOrder').value) || 0;

    const payload = {
        category,
        title: titleZh,
        title_i18n: { "zh-CN": titleZh, "en-US": titleEn },
        description: descZh,
        desc_i18n: { "zh-CN": descZh, "en-US": descEn },
        url,
        icon_class,
        sort_order,
        is_active: true
    };

    try {
        let res;
        if (id) {
            res = await adminFetch(`${API_BASE}/links/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            res = await adminFetch(`${API_BASE}/links`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        if (res.ok) {
            toast(id ? '外链已更新' : '外链创建成功', 'success');
            closeLinkModal();
            await loadLinks();
        }
    } catch (err) { toast(err.message, 'error'); }
});

// ======================= 3. 全局配置面板 =======================

async function loadConfigs() {
    try {
        const res = await adminFetch(`${API_BASE}/config/raw`);
        rawConfigs = await res.json();
        renderConfigsForm();
    } catch (e) {
        toast('加载站点配置失败: ' + e.message, 'error');
    }
}

function renderConfigsForm() {
    const container = document.getElementById('configsContainer');
    if (!container) return;
    const map = {};
    rawConfigs.forEach(c => { map[c.key] = c.value; });

    let announcementI18n = {};
    try { announcementI18n = JSON.parse(map.announcement_i18n || '{}'); } catch(e) {}

    container.innerHTML = `
        <div class="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm max-w-3xl">
            <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">网站名称 (site_name)</label>
                <input type="text" id="cfg_site_name" value="${escapeHtml(map.site_name || '超级工具箱 Pro')}" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white" />
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">全站公告 (中文 - announcement_zh)</label>
                <textarea id="cfg_announcement_zh" rows="2" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white">${escapeHtml(announcementI18n['zh-CN'] || map.announcement || '')}</textarea>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">全站公告 (英文 - announcement_en)</label>
                <textarea id="cfg_announcement_en" rows="2" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white">${escapeHtml(announcementI18n['en-US'] || '')}</textarea>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">OCR 离线模型魔搭加速仓库 (ocr_modelscope_repo)</label>
                <input type="text" id="cfg_ocr_modelscope_repo" value="${escapeHtml(map.ocr_modelscope_repo || '')}" placeholder="例如: your_username/toolbox_models (留空则使用本站服务器)" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white" />
                <p class="text-xs text-gray-400 mt-1">配置阿里魔搭公开模型库路径，前端将直接从国内千兆 BGP CDN 免费下载 det.tar/rec.tar，完全不消耗 VPS 服务器带宽。</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">全站公告显示开关 (announcement_active)</label>
                    <select id="cfg_announcement_active" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white">
                        <option value="1" ${map.announcement_active === '1' ? 'selected' : ''}>开启显示</option>
                        <option value="0" ${map.announcement_active !== '1' ? 'selected' : ''}>关闭隐藏</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">全站维护模式 (maintenance_mode)</label>
                    <select id="cfg_maintenance_mode" class="w-full text-sm border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 rounded-xl px-3.5 py-2.5 dark:text-white">
                        <option value="1" ${map.maintenance_mode === '1' ? 'selected' : ''}>开启维护 (仅管理员可用)</option>
                        <option value="0" ${map.maintenance_mode !== '1' ? 'selected' : ''}>正常对外运营</option>
                    </select>
                </div>
            </div>
            <div class="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end">
                <button onclick="saveAllConfigs()" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">保存全站配置</button>
            </div>
        </div>
    `;
}

window.saveAllConfigs = async function() {
    const site_name = document.getElementById('cfg_site_name').value.trim();
    const announcement_zh = document.getElementById('cfg_announcement_zh').value.trim();
    const announcement_en = document.getElementById('cfg_announcement_en').value.trim();
    const ocr_modelscope_repo = document.getElementById('cfg_ocr_modelscope_repo').value.trim();
    const announcement_active = document.getElementById('cfg_announcement_active').value;
    const maintenance_mode = document.getElementById('cfg_maintenance_mode').value;

    const updates = [
        { key: 'site_name', value: site_name, description: '网站名称' },
        { key: 'announcement', value: announcement_zh, description: '全站公告' },
        { key: 'announcement_i18n', value: JSON.stringify({ "zh-CN": announcement_zh, "en-US": announcement_en }), description: '多语言公告' },
        { key: 'ocr_modelscope_repo', value: ocr_modelscope_repo, description: 'OCR魔搭加速仓库' },
        { key: 'announcement_active', value: announcement_active, description: '全站公告开关' },
        { key: 'maintenance_mode', value: maintenance_mode, description: '维护模式开关' }
    ];

    try {
        for (const item of updates) {
            await adminFetch(`${API_BASE}/config`, {
                method: 'PUT',
                body: JSON.stringify(item)
            });
        }
        toast('全站配置已成功更新！', 'success');
        await loadConfigs();
    } catch (e) {
        toast('保存配置失败: ' + e.message, 'error');
    }
};

// ======================= 4. 用户与点数运营面板 (Phase 2a) =======================

let usersList = [];

window.loadUsers = async function() {
    const search = document.getElementById('userSearchInput')?.value || '';
    try {
        const res = await adminFetch(`${API_BASE}/users?page=1&limit=50&search=${encodeURIComponent(search)}`);
        if (!res.ok) throw new Error('获取用户列表失败');
        const data = await res.json();
        usersList = data.items || [];
        renderUsersTable();
    } catch (e) {
        toast('加载用户数据失败: ' + e.message, 'error');
    }
};

function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    if (!usersList.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-gray-400 text-sm">暂无注册用户</td></tr>`;
        return;
    }
    tbody.innerHTML = usersList.map(u => `
        <tr class="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <td class="py-3 px-4 text-xs font-mono text-gray-500">${u.id}</td>
            <td class="py-3 px-4 text-xs">
                <div class="font-bold text-gray-900 dark:text-white">${escapeHtml(u.username)}</div>
                <div class="text-[10px] text-gray-400 font-mono">${escapeHtml(u.email)}</div>
            </td>
            <td class="py-3 px-4 text-xs">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono ${u.role === 'superadmin' ? 'bg-purple-50 text-purple-600 dark:bg-slate-800 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300'}">${escapeHtml(u.role)}</span>
            </td>
            <td class="py-3 px-4 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                <i class="fas fa-coins text-[10px]"></i> ${Number(u.credit_balance) || 0} 点
            </td>
            <td class="py-3 px-4 text-xs text-gray-400 font-mono">${escapeHtml((u.created_at || '').substring(0, 16))}</td>
            <td class="py-3 px-4 text-xs">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] ${u.is_active ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}">
                    <span class="w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    ${u.is_active ? '正常' : '已封禁'}
                </span>
            </td>
            <td class="py-3 px-4 text-xs text-right space-x-2">
                <button onclick="openRechargeUserModalById(${u.id})" class="px-2.5 py-1 bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg font-semibold hover:bg-indigo-100">
                    <i class="fas fa-coins text-[10px]"></i> 调整点数
                </button>
                <button onclick="toggleUserActive(${u.id}, ${u.is_active ? 0 : 1})" class="px-2 py-1 ${u.is_active ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'} rounded-lg">
                    ${u.is_active ? '禁用' : '解封'}
                </button>
            </td>
        </tr>
    `).join('');
}

window.openRechargeUserModalById = function(id) {
    const u = usersList.find(x => x.id === id);
    if (!u) return;
    openRechargeUserModal(u.id, u.username, u.credit_balance);
};

window.openRechargeUserModal = function(id, username, bal) {
    document.getElementById('rechargeUserIdInput').value = id;
    document.getElementById('rechargeUserTargetLabel').textContent = `UID: ${id} · ${username} (当前余额: ${bal}点)`;
    document.getElementById('rechargeAmountInput').value = '';
    document.getElementById('rechargeRemarkInput').value = '';
    document.getElementById('rechargeUserModal').classList.remove('hidden');
};

window.closeRechargeUserModal = function() {
    document.getElementById('rechargeUserModal').classList.add('hidden');
};

window.toggleUserActive = async function(userId, newStatus) {
    if (!confirm(`确定要${newStatus ? '解封' : '禁用'}该用户账号吗？`)) return;
    try {
        const res = await adminFetch(`${API_BASE}/users/${userId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ is_active: newStatus })
        });
        if (res.ok) {
            toast('用户状态已更新', 'success');
            await loadUsers();
        }
    } catch (e) {
        toast('操作失败: ' + e.message, 'error');
    }
};

// ======================= 5. 工具定价与限额面板 (Phase 2a) =======================

let pricingList = [];

window.loadPricing = async function() {
    try {
        const res = await adminFetch(`${API_BASE}/tools/pricing`);
        if (!res.ok) throw new Error('获取定价失败');
        pricingList = await res.json();
        renderPricingTable();
    } catch (e) {
        toast('加载工具定价失败: ' + e.message, 'error');
    }
};

function renderPricingTable() {
    const tbody = document.getElementById('pricingTableBody');
    if (!tbody) return;
    tbody.innerHTML = pricingList.map(p => `
        <tr class="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
            <td class="py-3 px-4 text-xs font-mono font-bold text-gray-800 dark:text-gray-200">${escapeHtml(p.tool_key)}</td>
            <td class="py-3 px-4 text-xs">
                <input type="text" id="p_name_${escapeHtml(p.tool_key)}" value="${escapeHtml(p.display_name)}" class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 dark:text-white w-32" />
            </td>
            <td class="py-3 px-4 text-xs">
                <input type="number" min="0" id="p_cost_${escapeHtml(p.tool_key)}" value="${Number(p.credits_per_use) || 0}" class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 dark:text-white w-20 font-mono" />
            </td>
            <td class="py-3 px-4 text-xs">
                <input type="number" min="0" id="p_free_${escapeHtml(p.tool_key)}" value="${Number(p.daily_free_limit) || 0}" class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 dark:text-white w-24 font-mono" />
            </td>
            <td class="py-3 px-4 text-xs">
                <select id="p_enable_${escapeHtml(p.tool_key)}" class="text-xs border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2 py-1 dark:text-white">
                    <option value="1" ${p.is_enabled ? 'selected' : ''}>启用</option>
                    <option value="0" ${!p.is_enabled ? 'selected' : ''}>停用维护</option>
                </select>
            </td>
            <td class="py-3 px-4 text-xs text-right">
                <button onclick="saveToolPricing('${escapeHtml(p.tool_key)}')" class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm text-xs">
                    保存
                </button>
            </td>
        </tr>
    `).join('');
}

window.saveToolPricing = async function(toolKey) {
    const display_name = document.getElementById(`p_name_${toolKey}`).value.trim();
    const credits_per_use = parseInt(document.getElementById(`p_cost_${toolKey}`).value) || 0;
    const daily_free_limit = parseInt(document.getElementById(`p_free_${toolKey}`).value) || 0;
    const is_enabled = parseInt(document.getElementById(`p_enable_${toolKey}`).value) || 0;

    try {
        const res = await adminFetch(`${API_BASE}/tools/admin/${toolKey}/pricing`, {
            method: 'PUT',
            body: JSON.stringify({
                display_name,
                credits_per_use,
                daily_free_limit,
                free_tier_allowed: 1,
                is_enabled
            })
        });
        if (res.ok) {
            toast(`工具 [${display_name}] 定价与限额已更新！`, 'success');
            await loadPricing();
        }
    } catch (e) {
        toast('保存定价失败: ' + e.message, 'error');
    }
};

let isSubmittingRecharge = false;

window.submitRechargeUser = async function(e) {
    if (e) e.preventDefault();
    if (isSubmittingRecharge) return;

    const user_id = parseInt(document.getElementById('rechargeUserIdInput').value);
    const amount = parseInt(document.getElementById('rechargeAmountInput').value);
    const remark = document.getElementById('rechargeRemarkInput').value.trim();
    const submitBtn = document.querySelector('#rechargeUserForm button[type="submit"]');

    if (!user_id || isNaN(amount) || amount === 0 || !remark) {
        toast('请完整填写调账点数（非0）与审计原因', 'error');
        return;
    }

    isSubmittingRecharge = true;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }

    try {
        const res = await adminFetch(`${API_BASE}/credits/recharge`, {
            method: 'POST',
            body: JSON.stringify({ user_id, amount, remark })
        });
        if (res.ok) {
            toast('🎉 点数调整成功！已同步写入交易流水与审计日志', 'success');
            closeRechargeUserModal();
            await loadUsers();
        } else {
            const err = await res.json();
            toast('调整失败: ' + (err.detail || '未知错误'), 'error');
        }
    } catch (err) {
        toast('调整失败: ' + err.message, 'error');
    } finally {
        isSubmittingRecharge = false;
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
};

// 初始化执行与模态框表单绑定
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

