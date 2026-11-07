// js/adManager.js
import { showToast } from './utils.js';
import { fetchAds, trackAdClick, trackAdClose } from './configService.js';
import { getLocale, t } from './i18n.js';

const AdManager = {
    config: { closeDuration: 24 * 60 * 60 * 1000 },

    escapeHtml: function(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    sanitizeUrl: function(url) {
        if (!url) return '#';
        const trimmed = url.trim();
        if (trimmed.startsWith('javascript:void(0)') || trimmed === '#' || trimmed === '') {
            return 'javascript:void(0);';
        }
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
            return this.escapeHtml(trimmed);
        }
        return '#';
    },

    getI18nText: function(baseText, i18nMap) {
        const locale = getLocale() || 'zh-CN';
        if (i18nMap && typeof i18nMap === 'object' && i18nMap[locale]) {
            return i18nMap[locale];
        }
        return baseText || '';
    },

    init: async function() {
        // [Google AdSense 申请准备期]：全站广告暂时屏蔽，确保页面洁净通过 Google 审核
        const ADS_ENABLED = false;
        const slots = document.querySelectorAll('.ad-slot');
        if (!ADS_ENABLED || !slots.length) {
            slots.forEach(slot => { slot.style.display = 'none'; });
            return;
        }

        // 获取所有激活广告
        const { data: ads } = await fetchAds();

        slots.forEach(slot => {
            const slotId = slot.getAttribute('data-ad-slot') || slot.getAttribute('data-ad-id');
            if (this.isAdClosed(slotId)) {
                slot.style.display = 'none';
                return;
            }

            // 匹配属于该广告位的广告
            const matchedAd = ads.find(ad => ad.slot_id === slotId);
            if (matchedAd) {
                this.renderAdFromData(slot, matchedAd);
            } else {
                // 如果没有匹配的动态广告，尝试使用标签自带的静态属性进行旧版兼容渲染
                this.renderAdFromAttributes(slot);
            }
        });

        // 监听语言切换事件，重新渲染广告文本
        window.addEventListener('locale-changed', () => {
            this.init();
        });
    },

    isAdClosed: function(slotId) {
        if (!slotId) return false;
        const closedTime = localStorage.getItem('ad_closed_' + slotId);
        if (closedTime) {
            if (Date.now() - parseInt(closedTime) < this.config.closeDuration) {
                return true;
            } else {
                localStorage.removeItem('ad_closed_' + slotId);
            }
        }
        return false;
    },

    closeAd: function(adId, slotId, slotElement) {
        if (slotId) {
            localStorage.setItem('ad_closed_' + slotId, Date.now());
        }
        if (adId) {
            trackAdClose(adId);
        }
        slotElement.style.opacity = '0';
        setTimeout(() => { slotElement.style.display = 'none'; }, 300);
    },

    renderAdFromData: function(slot, ad) {
        const title = this.escapeHtml(this.getI18nText(ad.title, ad.title_i18n));
        const desc = this.escapeHtml(this.getI18nText(ad.description, ad.desc_i18n));
        const link = this.sanitizeUrl(ad.link_url);
        const imageUrl = this.sanitizeUrl(ad.image_url);
        const action = ad.action_type || 'link';
        const wechat = this.escapeHtml(ad.wechat_id);
        const format = ad.format || 'banner';

        const isDuoBao = link.includes('myp.hhdzai.top');
        const gradient = isDuoBao ? 'bg-gradient-to-r from-pink-500 to-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600';
        let iconClass = 'fa-rocket';
        if (isDuoBao) iconClass = 'fa-shopping-bag';
        else if (action === 'wechat') iconClass = 'fa-bullhorn';
        const icon = `<i class="fas ${iconClass} text-3xl mb-2 lg:mb-0 lg:text-4xl text-white/90"></i>`;

        const badgeText = t('ads.badge') || '广告';
        const closeTitle = t('ads.close_title') || '关闭广告';
        const actionContactText = t('ads.action_contact') || '点击联系';
        const actionGoText = t('ads.action_go') || '立即前往';
        const actionDetailsText = t('ads.action_details') || '查看详情';

        let innerHtml = '';
        if (ad.image_url && imageUrl !== '#') {
            innerHtml = `
                <a href="${link}" target="${action === 'wechat' ? '_self' : '_blank'}" rel="noopener sponsored" class="ad-main-link block w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative bg-gray-100 dark:bg-slate-800 flex items-center justify-center min-h-[100px]">
                    <img src="${imageUrl}" alt="${title}" class="w-full h-auto object-cover max-h-[160px]" style="max-width: 100%; display: block;" />
                    <span class="absolute ${format === 'banner' ? 'bottom-1 right-2' : 'top-2 right-2'} text-[10px] text-white/80 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">${badgeText}</span>
                </a>`;
        } else if (format === 'banner') {
            innerHtml = `
                <a href="${link}" target="${action === 'wechat' ? '_self' : '_blank'}" rel="noopener sponsored" class="ad-main-link block w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${gradient} p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between text-white">
                    <div class="flex items-center gap-4">
                        <div class="hidden sm:block p-3 bg-white/20 rounded-xl backdrop-blur-sm">${icon}</div>
                        <div>
                            <h3 class="text-lg sm:text-xl font-bold mb-1">${title}</h3>
                            <p class="text-white/80 text-sm sm:text-base">${desc}</p>
                        </div>
                    </div>
                    <div class="mt-4 sm:mt-0 px-6 py-2 bg-white text-gray-900 rounded-full font-medium text-sm hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap">
                        ${action === 'wechat' ? actionContactText : actionGoText} <i class="fas ${action === 'wechat' ? 'fa-comment-dots' : 'fa-arrow-right'} ml-1"></i>
                    </div>
                    <span class="absolute bottom-1 right-2 text-[10px] text-white/50 bg-black/10 px-1.5 py-0.5 rounded backdrop-blur-sm">${badgeText}</span>
                </a>`;
        } else {
            innerHtml = `
                <a href="${link}" target="${action === 'wechat' ? '_self' : '_blank'}" rel="noopener sponsored" class="ad-main-link block w-full rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group ${gradient} p-5 flex flex-col items-center text-center text-white min-h-[160px] justify-center">
                    ${icon}
                    <h3 class="text-lg font-bold mt-3 mb-1">${title}</h3>
                    <p class="text-white/80 text-xs">${desc}</p>
                    <div class="mt-4 px-4 py-1.5 bg-white text-gray-900 rounded-full font-medium text-xs hover:bg-gray-50 transition-colors shadow-sm w-full">${action === 'wechat' ? actionContactText : actionDetailsText}</div>
                    <span class="absolute top-2 right-2 text-[10px] text-white/50 bg-black/10 px-1.5 py-0.5 rounded backdrop-blur-sm">${badgeText}</span>
                </a>`;
        }

        slot.innerHTML = innerHtml + `
            <button class="absolute top-2 right-2 sm:top-3 sm:right-3 w-6 h-6 rounded-full bg-black/20 text-white/80 hover:bg-black/40 hover:text-white flex items-center justify-center transition-colors z-10 backdrop-blur-sm ad-close-btn" title="${closeTitle}">
                <i class="fas fa-times text-xs"></i>
            </button>`;
        slot.className = slot.className.replace(/\bhidden\b/, '').trim();
        if (!slot.className.includes('relative')) slot.className += ' relative transition-opacity duration-300';

        const closeBtn = slot.querySelector('.ad-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeAd(ad.id, ad.slot_id, slot);
            });
        }

        const mainLink = slot.querySelector('.ad-main-link');
        if (mainLink) {
            mainLink.addEventListener('click', (e) => {
                trackAdClick(ad.id);
                if (action === 'wechat') {
                    e.preventDefault();
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(wechat).then(() => {
                            showToast('✅ 微信号：' + wechat + ' 已复制到剪贴板，请前往微信添加好友！', 'success');
                        }).catch(() => { showToast('招商合作请添加微信号：' + wechat); });
                    } else {
                        showToast('招商合作请添加微信号：' + wechat);
                    }
                }
            });
        }
    },

    renderAdFromAttributes: function(slot) {
        // 兼容原有的 data-* 静态属性渲染
        const slotId = slot.getAttribute('data-ad-id') || slot.getAttribute('data-ad-slot');
        const defaultTitle = t('ads.default_title') || '赞助广告';
        const legacyAd = {
            id: 0,
            slot_id: slotId,
            title: slot.getAttribute('data-ad-title') || defaultTitle,
            title_i18n: {
                "zh-CN": slot.getAttribute('data-ad-title') || "赞助广告",
                "en-US": slot.getAttribute('data-ad-title-en') || "Sponsored"
            },
            description: slot.getAttribute('data-ad-desc') || '',
            desc_i18n: {},
            link_url: slot.getAttribute('data-ad-link') || '#',
            image_url: slot.getAttribute('data-ad-image') || '',
            action_type: slot.getAttribute('data-ad-action') || 'link',
            wechat_id: slot.getAttribute('data-ad-wechat') || '',
            format: slot.getAttribute('data-ad-format') || 'banner',
            is_active: true
        };
        this.renderAdFromData(slot, legacyAd);
    }
};

export function initAdManager() {
    AdManager.init();
}
