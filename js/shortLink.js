import { showToast, copyTextToClipboard } from './utils.js';
import { switchLinkToolTab, switchQRSubTab, regenerateQRCode } from './qrCode.js';
import { t } from './i18n.js';

let currentShortLinkSettings = {
    endpoint: '',
    jsonPath: ''
};

window.addEventListener('locale-changed', () => {
    renderShortLinkHistory();
});

function loadShortLinkSettings() {
    const savedEp = localStorage.getItem('shortlink_custom_endpoint');
    const savedPath = localStorage.getItem('shortlink_custom_path');
    if (savedEp) {
        currentShortLinkSettings.endpoint = savedEp;
        const inputEp = document.getElementById('sl-custom-endpoint');
        if (inputEp) inputEp.value = savedEp;
    }
    if (savedPath) {
        currentShortLinkSettings.jsonPath = savedPath;
        const inputPath = document.getElementById('sl-custom-path');
        if (inputPath) inputPath.value = savedPath;
    }
}

function toggleShortLinkSettings() {
    const modal = document.getElementById('sl-settings-modal');
    if (modal) modal.classList.toggle('hidden');
}

function saveShortLinkSettings() {
    const epInput = document.getElementById('sl-custom-endpoint');
    const pathInput = document.getElementById('sl-custom-path');
    if (!epInput || !pathInput) return;

    const ep = epInput.value.trim();
    const path = pathInput.value.trim();
    
    if (ep) {
        localStorage.setItem('shortlink_custom_endpoint', ep);
        currentShortLinkSettings.endpoint = ep;
    } else {
        localStorage.removeItem('shortlink_custom_endpoint');
        currentShortLinkSettings.endpoint = '';
    }

    if (path) {
        localStorage.setItem('shortlink_custom_path', path);
        currentShortLinkSettings.jsonPath = path;
    } else {
        localStorage.removeItem('shortlink_custom_path');
        currentShortLinkSettings.jsonPath = '';
    }

    showToast('⚙️ 自定义接口配置已保存');
    const modal = document.getElementById('sl-settings-modal');
    if (modal) modal.classList.add('hidden');
    validateShortLinkInputs();
}

function resetShortLinkSettings() {
    localStorage.removeItem('shortlink_custom_endpoint');
    localStorage.removeItem('shortlink_custom_path');
    currentShortLinkSettings.endpoint = '';
    currentShortLinkSettings.jsonPath = '';
    
    const epInput = document.getElementById('sl-custom-endpoint');
    const pathInput = document.getElementById('sl-custom-path');
    if (epInput) epInput.value = '';
    if (pathInput) pathInput.value = '';
    
    showToast('⚙️ 接口配置已重置为 is.gd');
    const modal = document.getElementById('sl-settings-modal');
    if (modal) modal.classList.add('hidden');
    validateShortLinkInputs();
}

function validateShortLinkInputs() {
    const urlInput = document.getElementById('sl-input-url');
    const aliasInput = document.getElementById('sl-input-alias');
    const genBtn = document.getElementById('btn-sl-generate');
    const urlErr = document.getElementById('sl-url-err-tip');
    const aliasErr = document.getElementById('sl-alias-err-tip');

    if (!urlInput || !aliasInput || !genBtn || !urlErr || !aliasErr) return;

    const urlVal = urlInput.value.trim();
    const aliasVal = aliasInput.value.trim();

    let isUrlValid = false;
    let isAliasValid = true;

    if (urlVal.length > 0) {
        try {
            const u = new URL(urlVal);
            if (u.protocol === 'http:' || u.protocol === 'https:') {
                isUrlValid = true;
                urlErr.classList.add('hidden');
            } else {
                urlErr.classList.remove('hidden');
            }
        } catch (e) {
            urlErr.classList.remove('hidden');
        }
    } else {
        urlErr.classList.add('hidden');
    }

    if (aliasVal.length > 0) {
        const aliasRegex = /^[a-zA-Z0-9_-]{3,30}$/;
        if (aliasRegex.test(aliasVal)) {
            isAliasValid = true;
            aliasErr.classList.add('hidden');
            aliasInput.classList.remove('border-red-500');
        } else {
            isAliasValid = false;
            aliasErr.classList.remove('hidden');
            aliasInput.classList.add('border-red-500');
        }
    } else {
        aliasErr.classList.add('hidden');
        aliasInput.classList.remove('border-red-500');
    }

    genBtn.disabled = !(isUrlValid && isAliasValid);
}

async function generateShortLink(longUrl, alias) {
    // 1. 优先尝试本地自建后端短链服务 (极速 302 直达，无第三方中转等待页、无广告)
    try {
        const proxyResp = await fetch('/api/v1/tools/shortlink/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: longUrl, alias: alias || '' })
        });
        if (proxyResp.ok) {
            const result = await proxyResp.json();
            if (result && result.short_url) {
                return result.short_url;
            }
        } else {
            const err = await proxyResp.json().catch(() => ({}));
            if (proxyResp.status === 400) {
                throw new Error(err.detail || '短链接别名已被占用或格式错误');
            } else if (proxyResp.status === 502 || proxyResp.status === 500) {
                throw new Error(err.detail || '短链接服务端异常，请稍后重试');
            }
        }
    } catch (proxyErr) {
        // 若为业务错误 (如别名占用)，直接向上抛出供 UI 显示
        if (proxyErr.message && !proxyErr.message.includes('fetch') && !proxyErr.message.includes('NetworkError') && !proxyErr.message.includes('Failed to fetch')) {
            throw proxyErr;
        }
    }

    // 2. 纯静态部署降级：浏览器直连公共短链接接口 (优先 is.gd，绝不使用带倒计时中转页的 TinyURL)
    try {
        let isGdUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
        if (alias) {
            isGdUrl += `&shorturl=${encodeURIComponent(alias)}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(isGdUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`is.gd HTTP ${response.status}`);
        }

        const data = await response.json();

        if (data && data.shorturl) {
            return data.shorturl;
        } else if (data && data.errorcode) {
            const errMap = {
                1: '短网址生成失败：' + (data.errormessage || '未知错误'),
                2: '自定义后缀已经被抢占，请尝试其他后缀别名',
                3: '链接格式被拒绝，可能已被拉入服务黑名单',
                4: '请求太频繁（速率限制），请稍后再试'
            };
            throw new Error(errMap[data.errorcode] || data.errormessage || '短链接服务返回异常');
        } else {
            throw new Error('is.gd 返回了非标准数据格式');
        }
    } catch (isGdError) {
        if (alias) {
            throw isGdError;
        }

        // 3. 备用降级：ulvis.net (纯净 301 重定向，无倒计时中转页)
        try {
            const ulvisUrl = `https://ulvis.net/api.php?url=${encodeURIComponent(longUrl)}`;
            const controller2 = new AbortController();
            const timeoutId2 = setTimeout(() => controller2.abort(), 6000);

            const resp2 = await fetch(ulvisUrl, {
                method: 'GET',
                signal: controller2.signal
            });

            clearTimeout(timeoutId2);

            if (!resp2.ok) {
                throw new Error(`ulvis HTTP ${resp2.status}`);
            }

            const shortUrl = (await resp2.text()).trim();
            if (shortUrl && shortUrl.startsWith('http')) {
                return shortUrl;
            }
            throw new Error('短链接口返回了无效数据');
        } catch (fallbackErr) {
            throw new Error('短链接服务暂时不可用，请稍后重试');
        }
    }
}

async function generateCustomShortLink(longUrl, endpoint, path) {
    let targetUrl = endpoint + encodeURIComponent(longUrl);
    const response = await fetch(targetUrl, {
        method: 'GET',
        mode: 'cors'
    });

    if (!response.ok) {
        throw new Error(`API 请求失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    
    if (path) {
        const parts = path.split('.');
        let val = data;
        for (let part of parts) {
            if (val && val[part] !== undefined) {
                val = val[part];
            } else {
                val = null;
                break;
            }
        }
        if (val) return val;
    }

    return data.shorturl || data.short_url || data.result || data.url || null;
}

let isShortLinkGenerating = false;

async function handleShortLinkGenerate() {
    if (isShortLinkGenerating) return;
    const urlInput = document.getElementById('sl-input-url');
    const aliasInput = document.getElementById('sl-input-alias');
    const genBtn = document.getElementById('btn-sl-generate');
    const resultCard = document.getElementById('sl-result-card');

    if (!urlInput || !aliasInput || !genBtn || !resultCard) return;

    const longUrl = urlInput.value.trim();
    const alias = aliasInput.value.trim();

    if (!longUrl) return;

    isShortLinkGenerating = true;
    const defaultBtnContent = '<span data-i18n="link_tools.shortlink_generate_btn">开始生成短链接</span>';
    const originalText = genBtn.getAttribute('data-original-text') || defaultBtnContent;
    genBtn.setAttribute('data-original-text', originalText);
    genBtn.disabled = true;
    genBtn.innerHTML = `<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 正在生成中...`;
    resultCard.classList.add('hidden');

    try {
        let shortUrl = '';
        if (currentShortLinkSettings.endpoint) {
            shortUrl = await generateCustomShortLink(longUrl, currentShortLinkSettings.endpoint, currentShortLinkSettings.jsonPath);
            if (!shortUrl) throw new Error('解析自定义短链接口失败，未找到短链字段');
        } else {
            shortUrl = await generateShortLink(longUrl, alias);
        }

        const slResultUrl = document.getElementById('sl-result-url');
        const slResultOpen = document.getElementById('sl-result-open');
        if (slResultUrl) slResultUrl.textContent = shortUrl;
        if (slResultOpen) slResultOpen.href = shortUrl;
        resultCard.classList.remove('hidden');

        saveShortLinkHistory({
            original: longUrl,
            short: shortUrl,
            alias: alias || '无',
            time: Date.now()
        });

        aliasInput.value = '';
        if (window.trackFeatureUse) window.trackFeatureUse('shortlink_generate', 'ok');
        showToast('🎉 短链接生成成功！');
    } catch (err) {
        console.error('短链生成失败:', err);
        if (window.trackFeatureUse) window.trackFeatureUse('shortlink_generate', 'fail');
        showToast('❌ 生成短网址失败：' + err.message, 'error');
    } finally {
        isShortLinkGenerating = false;
        genBtn.disabled = false;
        genBtn.innerHTML = genBtn.getAttribute('data-original-text') || defaultBtnContent;
        validateShortLinkInputs();
    }
}

function loadShortLinkHistory() {
    const data = localStorage.getItem('shortlink_history_list');
    return data ? JSON.parse(data) : [];
}

function saveShortLinkHistory(item) {
    let list = loadShortLinkHistory();
    list = list.filter(x => x.short !== item.short);
    list.unshift(item);
    if (list.length > 10) {
        list.pop();
    }
    localStorage.setItem('shortlink_history_list', JSON.stringify(list));
    renderShortLinkHistory();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function renderShortLinkHistory() {
    const list = loadShortLinkHistory();
    const container = document.getElementById('sl-history-list');
    const emptyBox = document.getElementById('sl-history-empty');
    const clearBtn = document.getElementById('btn-sl-clear-history');

    if (!container || !emptyBox || !clearBtn) return;

    if (list.length === 0) {
        container.classList.add('hidden');
        emptyBox.classList.remove('hidden');
        clearBtn.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');
    emptyBox.classList.add('hidden');
    clearBtn.classList.remove('hidden');

    container.innerHTML = '';
    list.forEach((item, index) => {
        const dateStr = new Date(item.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const aliasTpl = t('link_tools.shortlink_alias_label') || '别名: {alias}';
        const origTpl = t('link_tools.shortlink_orig_label') || '原网址: {orig}';
        const copyBtnText = t('link_tools.decode_copy_btn') || '复制';
        const toQrText = t('link_tools.shortlink_to_qr') || '转二维码';
        
        const card = document.createElement('div');
        card.className = "p-3.5 bg-gray-50/70 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-slate-800/50 flex flex-col gap-2 relative group hover:border-indigo-500/30 transition-all";
        card.innerHTML = `
            <div class="flex items-center justify-between">
                <span class="text-[10px] text-gray-400 font-mono">${dateStr}</span>
                <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-700 text-gray-500 dark:text-gray-400">${aliasTpl.replace('{alias}', escapeHtml(item.alias))}</span>
            </div>
            <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono select-all truncate">
                ${escapeHtml(item.short)}
            </div>
            <div class="text-[10px] text-gray-400 dark:text-gray-500 truncate" title="${escapeHtml(item.original)}">
                ${origTpl.replace('{orig}', escapeHtml(item.original))}
            </div>
            
            <div class="flex items-center justify-end gap-1.5 pt-1.5 border-t border-gray-200/40 dark:border-slate-800/30">
                <button onclick="copyTextToClipboard('${item.short}', '${t('link_tools.shortlink_copied') || '复制成功'}')" class="px-2.5 py-1 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-darkBorder rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 transition-colors">
                    <i class="fa-regular fa-copy mr-1"></i>${copyBtnText}
                </button>
                <button onclick="convertHistoryToQRCode('${item.short}')" class="px-2.5 py-1 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 border border-gray-200 dark:border-darkBorder rounded-lg text-[10px] font-semibold text-gray-600 dark:text-gray-300 transition-colors">
                    <i class="fa-solid fa-qrcode mr-1"></i>${toQrText}
                </button>
                <button onclick="deleteShortLinkHistory(${index})" class="px-2 py-1 bg-white hover:bg-red-50 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/40 dark:hover:text-red-400 border border-gray-200 dark:border-darkBorder rounded-lg text-[10px] text-gray-500 transition-colors" title="删除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function deleteShortLinkHistory(index) {
    let list = loadShortLinkHistory();
    list.splice(index, 1);
    localStorage.setItem('shortlink_history_list', JSON.stringify(list));
    renderShortLinkHistory();
    showToast(t('link_tools.shortlink_deleted') || '已删除该条历史');
}

function clearShortLinkHistory() {
    if (confirm('⚠️ 确定要清空所有本地短链接生成记录吗？该操作不可恢复。')) {
        localStorage.removeItem('shortlink_history_list');
        renderShortLinkHistory();
        showToast('历史记录已清空');
    }
}

function linkToQRCodeTab() {
    const shortUrlEl = document.getElementById('sl-result-url');
    if (!shortUrlEl) return;
    const shortUrl = shortUrlEl.textContent;
    if (!shortUrl) return;

    switchLinkToolTab('qrcode');
    switchQRSubTab('generate');

    const qrInput = document.getElementById('qr-input-text');
    if (qrInput) {
        qrInput.value = shortUrl;
        regenerateQRCode();
        showToast('🔄 已成功将短链接导入二维码生成器');
    }
}

function convertHistoryToQRCode(url) {
    if (!url) return;
    
    switchLinkToolTab('qrcode');
    switchQRSubTab('generate');

    const qrInput = document.getElementById('qr-input-text');
    if (qrInput) {
        qrInput.value = url;
        regenerateQRCode();
        showToast('🔄 已成功将历史短链导入二维码生成器');
    }
}

export function initShortLink() {
    // Expose to window for inline calls
    window.toggleShortLinkSettings = toggleShortLinkSettings;
    window.saveShortLinkSettings = saveShortLinkSettings;
    window.resetShortLinkSettings = resetShortLinkSettings;
    
    window.handleShortLinkGenerate = handleShortLinkGenerate;
    window.deleteShortLinkHistory = deleteShortLinkHistory;
    window.clearShortLinkHistory = clearShortLinkHistory;
    window.linkToQRCodeTab = linkToQRCodeTab;
    window.convertHistoryToQRCode = convertHistoryToQRCode;

    const urlInput = document.getElementById('sl-input-url');
    if (urlInput) {
        urlInput.addEventListener('input', validateShortLinkInputs);
    }
    const aliasInput = document.getElementById('sl-input-alias');
    if (aliasInput) {
        aliasInput.addEventListener('input', validateShortLinkInputs);
    }

    const genBtn = document.getElementById('btn-sl-generate');
    if (genBtn) {
        genBtn.addEventListener('click', handleShortLinkGenerate);
    }

    const clearHistoryBtn = document.getElementById('btn-sl-clear-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearShortLinkHistory);
    }

    const settingsBtn = document.getElementById('btn-sl-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', toggleShortLinkSettings);
    }

    const saveSettingsBtn = document.getElementById('btn-sl-save-settings');
    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', saveShortLinkSettings);
    }

    const resetSettingsBtn = document.getElementById('btn-sl-reset-settings');
    if (resetSettingsBtn) {
        resetSettingsBtn.addEventListener('click', resetShortLinkSettings);
    }

    const modalCloseBtn = document.querySelector('#sl-settings-modal button[onclick="toggleShortLinkSettings()"]');
    if (modalCloseBtn) {
        modalCloseBtn.removeAttribute('onclick');
        modalCloseBtn.addEventListener('click', toggleShortLinkSettings);
    }

    const aliasPrefix = document.getElementById('sl-alias-prefix');
    if (aliasPrefix && window.location.host) {
        aliasPrefix.textContent = `${window.location.host}/s/`;
    }

    loadShortLinkSettings();
    renderShortLinkHistory();
}
