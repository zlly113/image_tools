/**
 * js/pdfTools.js - 超级工具箱 Pro: 本地离线 PDF 魔法工具箱
 * 
 * 核心技术栈：
 * - pdf-lib (纯客户端结构化操作：合并、拆分、旋转、重排、图片嵌入、元数据清除)
 * - PDF.js (客户端高保真页面栅格化渲染、缩略图生成、PDF 转图片)
 * - JSZip (客户端批量 ZIP 打包与极速导出)
 * 
 * 100% 浏览器本地内存运行，绝不上传任何字节到外部服务器，极致保障用户隐私。
 */

import { showToast, validateFile } from './utils.js';
import { trackFeatureUse } from './tracker.js';

// 格式化字节大小辅助函数
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 严防 XSS 注入的安全 HTML 转义辅助函数
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 全局状态管理
const state = {
    currentTab: 'organize', // 'organize' | 'convert' | 'security'
    
    // 页面管理模块
    organizeMode: 'organizer', // 'organizer' | 'merge' | 'split'
    organizerDoc: null,
    organizerBytes: null,
    organizerFilename: 'document.pdf',
    organizerPages: [], // [{ id, pageNum, rotation, canvas }]
    
    // 多文件合并模块
    mergeFiles: [], // [{ id, file, name, size, pageCount, bytes, range }]
    
    // 页面拆分模块
    splitDoc: null,
    splitBytes: null,
    splitFilename: 'document.pdf',
    splitTotalPages: 0,
    
    // 格式互转模块
    convertMode: 'pdf_to_img', // 'pdf_to_img' | 'img_to_pdf'
    pdfToImgDoc: null,
    pdfToImgFilename: 'document.pdf',
    pdfToImgTotalPages: 0,
    pdfToImgDpi: 2.0,
    pdfToImgFormat: 'image/png',
    
    imgToPdfFiles: [], // [{ id, file, name, size, dataUrl }]
    imgToPdfOrientation: 'a4_p', // 'a4_p' | 'a4_l' | 'fit'
    imgToPdfMargin: 15,
    
    // 安全防护模块
    securityMode: 'watermark', // 'watermark' | 'page_number' | 'metadata'
    securityDoc: null,
    securityPdfjsDoc: null,
    securityBytes: null,
    securityFilename: 'document.pdf',
    securityTotalPages: 0,
    
    // 水印配置
    watermarkText: '仅供办理业务使用 他用无效',
    watermarkMode: 'tile', // 'tile' | 'center'
    watermarkAngle: -30,
    watermarkOpacity: 0.25,
    watermarkFontSize: 26,
    watermarkColor: '#dc2626',
    
    // 页码配置
    pageNumberFormat: '第 {page} 页 / 共 {total} 页',
    pageNumberPosition: 'bottom_center', // 'bottom_center' | 'bottom_right' | 'bottom_left' | 'top_center'
    pageNumberFontSize: 11,
    pageNumberMargin: 25,
    pageNumberColor: '#64748b',
    
    // 元数据配置
    currentMetadata: null
};

// 确保 PDF.js Worker 正确配置
function ensurePdfJsWorker() {
    if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/models/pdf.worker.min.js';
    }
}

// 辅助方法：触发文件流下载
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// 辅助方法：将 DataURL 转为 Uint8Array
function dataUrlToUint8Array(dataUrl) {
    const byteString = atob(dataUrl.split(',')[1]);
    const u8 = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        u8[i] = byteString.charCodeAt(i);
    }
    return u8;
}

// 解析页码字符串 (例如 "1-3, 5, 8-10")，返回从 0 开始的页面索引数组
function parsePageRanges(rangeStr, totalPages) {
    if (!rangeStr || !rangeStr.trim() || rangeStr.trim().toLowerCase() === 'all' || rangeStr.trim() === '全部') {
        return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages = new Set();
    const parts = rangeStr.split(/[,，]/);
    for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-');
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            if (!isNaN(start) && !isNaN(end)) {
                const low = Math.max(1, Math.min(start, end));
                const high = Math.min(totalPages, Math.max(start, end));
                for (let i = low; i <= high; i++) {
                    pages.add(i - 1);
                }
            }
        } else {
            const num = parseInt(trimmed, 10);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
                pages.add(num - 1);
            }
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

/* ========================================================
 * 1. 选项卡与子视图切换
 * ======================================================== */

export function switchPdfTab(tabKey) {
    state.currentTab = tabKey;
    trackFeatureUse(`pdf_tab_${tabKey}`);

    const tabs = ['organize', 'convert', 'security'];
    tabs.forEach(key => {
        const section = document.getElementById(`pdf-section-${key}`);
        const btn = document.getElementById(`pdf-tab-btn-${key}`);
        if (section) section.classList.add('hidden');
        if (btn) {
            btn.className = "px-3.5 py-1.5 rounded-lg font-medium text-xs md:text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1.5";
        }
    });

    const activeSection = document.getElementById(`pdf-section-${tabKey}`);
    const activeBtn = document.getElementById(`pdf-tab-btn-${tabKey}`);
    if (activeSection) activeSection.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-3.5 py-1.5 rounded-lg font-semibold text-xs md:text-sm bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors flex items-center gap-1.5";
    }
}

export function switchOrganizeSubMode(mode) {
    state.organizeMode = mode;
    ['organizer', 'merge', 'split'].forEach(m => {
        const el = document.getElementById(`pdf-organize-mode-${m}`);
        const btn = document.getElementById(`btn-mode-${m}`);
        if (el) el.classList.add('hidden');
        if (btn) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800";
        }
    });
    const activeEl = document.getElementById(`pdf-organize-mode-${mode}`);
    const activeBtn = document.getElementById(`btn-mode-${mode}`);
    if (activeEl) activeEl.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors";
    }
}

export function switchConvertSubMode(mode) {
    state.convertMode = mode;
    ['pdf_to_img', 'img_to_pdf'].forEach(m => {
        const el = document.getElementById(`pdf-convert-mode-${m}`);
        const btn = document.getElementById(`btn-convert-${m}`);
        if (el) el.classList.add('hidden');
        if (btn) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800";
        }
    });
    const activeEl = document.getElementById(`pdf-convert-mode-${mode}`);
    const activeBtn = document.getElementById(`btn-convert-${mode}`);
    if (activeEl) activeEl.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors";
    }
}

export function switchSecuritySubMode(mode) {
    state.securityMode = mode;
    ['watermark', 'page_number', 'metadata'].forEach(m => {
        const el = document.getElementById(`pdf-security-mode-${m}`);
        const btn = document.getElementById(`btn-security-${m}`);
        if (el) el.classList.add('hidden');
        if (btn) {
            btn.className = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800";
        }
    });
    const activeEl = document.getElementById(`pdf-security-mode-${mode}`);
    const activeBtn = document.getElementById(`btn-security-${mode}`);
    if (activeEl) activeEl.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors";
    }
    updateSecurityPreview();
}

/* ========================================================
 * 2. 模块一：页面管理与编排 (Organize)
 * ======================================================== */

// 2.1 可视化卡片页面编排器
async function loadPdfForOrganizer(file) {
    try {
        ensurePdfJsWorker();

        // 释放上一份旧文档的 pdf.js worker 内存
        if (state.organizerDoc) {
            try { state.organizerDoc.destroy(); } catch (e) {}
            state.organizerDoc = null;
        }

        // 递增 generation 令牌，防止并发切换文件时渲染竞态交错
        state.organizerGen = (state.organizerGen || 0) + 1;
        const currentGen = state.organizerGen;

        state.organizerFilename = file.name;
        state.organizerBytes = await file.arrayBuffer();
        
        const loadingTask = window.pdfjsLib.getDocument({
            data: state.organizerBytes.slice(0),
            isEvalSupported: false
        });
        state.organizerDoc = await loadingTask.promise;
        const total = state.organizerDoc.numPages;
        
        state.organizerPages = [];
        const container = document.getElementById('pdfOrganizerGrid');
        const emptyState = document.getElementById('pdfOrganizerEmpty');
        const actionsBar = document.getElementById('pdfOrganizerActions');
        
        if (emptyState) emptyState.classList.add('hidden');
        if (actionsBar) actionsBar.classList.remove('hidden');
        if (container) {
            container.classList.remove('hidden');
            container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p>正在高保真渲染 ${total} 页缩略图...</p></div>`;
        }
        
        // 渲染每一页为卡片缩略图
        for (let i = 1; i <= total; i++) {
            if (currentGen !== state.organizerGen) return; // 已切换至新文件，立即终止
            const page = await state.organizerDoc.getPage(i);
            const viewport = page.getViewport({ scale: 0.35 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            
            state.organizerPages.push({
                id: `page_${i}_${Date.now()}`,
                originalIndex: i - 1,
                rotation: 0,
                canvasDataUrl: canvas.toDataURL('image/jpeg', 0.8)
            });
            try { page.cleanup(); } catch (e) {}
        }
        
        if (currentGen !== state.organizerGen) return;
        renderOrganizerCards();
        showToast(`已成功加载 PDF 共 ${total} 页`, 'success');
    } catch (err) {
        console.error("加载 PDF 失败:", err);
        showToast('加载 PDF 失败: ' + err.message, 'error');
    }
}

function renderOrganizerCards() {
    const container = document.getElementById('pdfOrganizerGrid');
    if (!container) return;
    container.innerHTML = '';
    
    if (state.organizerPages.length === 0) {
        container.innerHTML = `<div class="col-span-full py-12 text-center text-gray-400">所有页面已被删除，请重新上传文件。</div>`;
        return;
    }

    state.organizerPages.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = "group relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-all flex flex-col items-center select-none cursor-move";
        card.draggable = true;
        card.dataset.index = index;

        // 拖拽事件监听
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', index);
            card.classList.add('opacity-40', 'scale-95');
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('opacity-40', 'scale-95');
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.classList.add('ring-2', 'ring-indigo-500');
        });
        card.addEventListener('dragleave', () => {
            card.classList.remove('ring-2', 'ring-indigo-500');
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('ring-2', 'ring-indigo-500');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
            const toIndex = index;
            if (!isNaN(fromIndex) && fromIndex !== toIndex) {
                const movedItem = state.organizerPages.splice(fromIndex, 1)[0];
                state.organizerPages.splice(toIndex, 0, movedItem);
                renderOrganizerCards();
            }
        });

        // 卡片内容
        card.innerHTML = `
            <div class="w-full flex items-center justify-between mb-2">
                <span class="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400">#${index + 1} (原 P${item.originalIndex + 1})</span>
                ${item.rotation !== 0 ? `<span class="text-[10px] text-amber-500 font-mono"><i class="fas fa-redo text-[9px]"></i> ${item.rotation}°</span>` : ''}
            </div>
            <div class="w-full h-44 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-3 relative">
                <img src="${item.canvasDataUrl}" class="max-h-full max-w-full object-contain transition-transform duration-300" style="transform: rotate(${item.rotation}deg);" alt="Page ${index + 1}">
            </div>
            <div class="w-full flex items-center justify-between gap-1 pt-1 border-t border-gray-100 dark:border-slate-700/60">
                <button type="button" class="btn-rotate-ccw p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs" title="逆时针旋转 90°">
                    <i class="fas fa-undo"></i>
                </button>
                <div class="flex items-center gap-1">
                    <button type="button" class="btn-move-left p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}" title="向前移动">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <button type="button" class="btn-move-right p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs ${index === state.organizerPages.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}" title="向后移动">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <button type="button" class="btn-rotate-cw p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 text-xs" title="顺时针旋转 90°">
                    <i class="fas fa-redo"></i>
                </button>
                <button type="button" class="btn-delete p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 text-xs" title="删除该页">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // 绑定按钮事件
        card.querySelector('.btn-rotate-ccw').onclick = (e) => {
            e.stopPropagation();
            item.rotation = (item.rotation - 90 + 360) % 360;
            renderOrganizerCards();
        };
        card.querySelector('.btn-rotate-cw').onclick = (e) => {
            e.stopPropagation();
            item.rotation = (item.rotation + 90) % 360;
            renderOrganizerCards();
        };
        card.querySelector('.btn-delete').onclick = (e) => {
            e.stopPropagation();
            state.organizerPages.splice(index, 1);
            renderOrganizerCards();
        };
        card.querySelector('.btn-move-left').onclick = (e) => {
            e.stopPropagation();
            if (index > 0) {
                const temp = state.organizerPages[index];
                state.organizerPages[index] = state.organizerPages[index - 1];
                state.organizerPages[index - 1] = temp;
                renderOrganizerCards();
            }
        };
        card.querySelector('.btn-move-right').onclick = (e) => {
            e.stopPropagation();
            if (index < state.organizerPages.length - 1) {
                const temp = state.organizerPages[index];
                state.organizerPages[index] = state.organizerPages[index + 1];
                state.organizerPages[index + 1] = temp;
                renderOrganizerCards();
            }
        };

        container.appendChild(card);
    });

    const countBadge = document.getElementById('organizerTotalBadge');
    if (countBadge) {
        countBadge.textContent = `共 ${state.organizerPages.length} 页`;
    }
}

// 导出重排与旋转后的 PDF
async function exportOrganizedPdf() {
    if (!state.organizerBytes || state.organizerPages.length === 0) {
        showToast('没有可导出的页面', 'warning');
        return;
    }
    const btn = document.getElementById('btnExportOrganizedPdf');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在组装导出...'; }

    try {
        const { PDFDocument, degrees } = window.PDFLib;
        const srcDoc = await PDFDocument.load(state.organizerBytes);
        const outDoc = await PDFDocument.create();

        // 提取原图页面映射
        const indicesToCopy = state.organizerPages.map(p => p.originalIndex);
        const copiedPages = await outDoc.copyPages(srcDoc, indicesToCopy);

        copiedPages.forEach((page, i) => {
            const rot = state.organizerPages[i].rotation;
            if (rot !== 0) {
                const currentRot = page.getRotation().angle;
                page.setRotation(degrees((currentRot + rot) % 360));
            }
            outDoc.addPage(page);
        });

        const outBytes = await outDoc.save();
        const baseName = state.organizerFilename.replace(/\.pdf$/i, '');
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `${baseName}_organized.pdf`);
        showToast('PDF 编排导出成功！', 'success');
    } catch (err) {
        console.error("导出编排 PDF 失败:", err);
        showToast('导出编排 PDF 失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-export mr-2"></i>导出并下载新 PDF'; }
    }
}

// 2.2 多文件合并 (Merge)
async function handleAddMergeFiles(files) {
    ensurePdfJsWorker();
    for (const file of files) {
        if (!file.name.toLowerCase().endsWith('.pdf')) continue;
        try {
            const bytes = await file.arrayBuffer();
            const pdfDoc = await window.pdfjsLib.getDocument({
                data: bytes.slice(0),
                isEvalSupported: false
            }).promise;
            state.mergeFiles.push({
                id: `merge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                file,
                name: file.name,
                size: file.size,
                pageCount: pdfDoc.numPages,
                bytes,
                range: '全部'
            });
        } catch (err) {
            console.error("解析合并文件失败:", file.name, err);
            showToast(`文件 ${file.name} 解析失败`, 'error');
        }
    }
    renderMergeList();
}

function renderMergeList() {
    const container = document.getElementById('pdfMergeList');
    const emptyState = document.getElementById('pdfMergeEmpty');
    const actionWrap = document.getElementById('pdfMergeActions');
    if (!container) return;

    if (state.mergeFiles.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (actionWrap) actionWrap.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (actionWrap) actionWrap.classList.remove('hidden');
    container.innerHTML = '';

    state.mergeFiles.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = "flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm gap-4";
        row.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0">
                    ${index + 1}
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">${escapeHtml(item.name)}</p>
                    <p class="text-xs text-gray-400">${formatBytes(item.size)} · 共 ${item.pageCount} 页</p>
                </div>
            </div>
            <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div class="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>页码范围:</span>
                    <input type="text" class="input-range w-24 px-2 py-1 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-500" value="${item.range}" placeholder="全部 或 1-3,5">
                </div>
                <div class="flex items-center gap-1">
                    <button type="button" class="btn-move-up p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}">
                        <i class="fas fa-arrow-up text-xs"></i>
                    </button>
                    <button type="button" class="btn-move-down p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 ${index === state.mergeFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}">
                        <i class="fas fa-arrow-down text-xs"></i>
                    </button>
                    <button type="button" class="btn-delete p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                        <i class="fas fa-trash-alt text-xs"></i>
                    </button>
                </div>
            </div>
        `;

        row.querySelector('.input-range').onchange = (e) => {
            item.range = e.target.value.trim() || '全部';
        };
        row.querySelector('.btn-move-up').onclick = () => {
            if (index > 0) {
                const temp = state.mergeFiles[index];
                state.mergeFiles[index] = state.mergeFiles[index - 1];
                state.mergeFiles[index - 1] = temp;
                renderMergeList();
            }
        };
        row.querySelector('.btn-move-down').onclick = () => {
            if (index < state.mergeFiles.length - 1) {
                const temp = state.mergeFiles[index];
                state.mergeFiles[index] = state.mergeFiles[index + 1];
                state.mergeFiles[index + 1] = temp;
                renderMergeList();
            }
        };
        row.querySelector('.btn-delete').onclick = () => {
            state.mergeFiles.splice(index, 1);
            renderMergeList();
        };

        container.appendChild(row);
    });
}

// 执行合并
async function executeMergePdfs() {
    if (state.mergeFiles.length < 2) {
        showToast('请至少添加 2 个 PDF 文件进行合并', 'warning');
        return;
    }
    const btn = document.getElementById('btnExecuteMerge');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在合并中...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const mergedDoc = await PDFDocument.create();

        for (const item of state.mergeFiles) {
            const srcDoc = await PDFDocument.load(item.bytes);
            const total = srcDoc.getPageCount();
            const indices = parsePageRanges(item.range, total);
            if (indices.length > 0) {
                const pages = await mergedDoc.copyPages(srcDoc, indices);
                pages.forEach(p => mergedDoc.addPage(p));
            }
        }

        const outBytes = await mergedDoc.save();
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `merged_documents_${Date.now()}.pdf`);
        showToast(`成功合并 ${state.mergeFiles.length} 个 PDF 文件！`, 'success');
    } catch (err) {
        console.error("合并 PDF 失败:", err);
        showToast('合并 PDF 失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-layer-group mr-2"></i>一键合并并下载 PDF'; }
    }
}

// 2.3 页面拆分 (Split)
async function loadPdfForSplit(file) {
    try {
        ensurePdfJsWorker();
        state.splitFilename = file.name;
        state.splitBytes = await file.arrayBuffer();
        const pdfDoc = await window.pdfjsLib.getDocument({
            data: state.splitBytes.slice(0),
            isEvalSupported: false
        }).promise;
        state.splitTotalPages = pdfDoc.numPages;
        try { pdfDoc.destroy(); } catch (e) {}

        const info = document.getElementById('splitFileInfo');
        const actions = document.getElementById('splitActionsWrap');
        if (info) {
            info.innerHTML = `
                <div class="p-4 bg-indigo-50/70 dark:bg-slate-800/70 rounded-2xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${escapeHtml(file.name)}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${formatBytes(file.size)} · 共 ${state.splitTotalPages} 页</p>
                    </div>
                    <span class="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold">已就绪</span>
                </div>
            `;
        }
        if (actions) actions.classList.remove('hidden');
        showToast(`已加载 ${file.name}，可开始拆分`, 'success');
    } catch (err) {
        console.error("加载拆分 PDF 失败:", err);
        showToast('加载文件失败: ' + err.message, 'error');
    }
}

// 范围提取
async function executeExtractSplit() {
    if (!state.splitBytes) return;
    const rangeInput = document.getElementById('splitRangeInput');
    const rangeStr = rangeInput ? rangeInput.value.trim() : '';
    const indices = parsePageRanges(rangeStr, state.splitTotalPages);
    
    if (indices.length === 0) {
        showToast('请输入有效的页码范围 (例如 1-3, 5)', 'warning');
        return;
    }

    const btn = document.getElementById('btnExtractSplit');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>提取中...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const srcDoc = await PDFDocument.load(state.splitBytes);
        const outDoc = await PDFDocument.create();
        const pages = await outDoc.copyPages(srcDoc, indices);
        pages.forEach(p => outDoc.addPage(p));

        const outBytes = await outDoc.save();
        const baseName = state.splitFilename.replace(/\.pdf$/i, '');
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `${baseName}_extracted.pdf`);
        showToast(`成功提取 ${indices.length} 页并导出！`, 'success');
    } catch (err) {
        console.error("提取页面失败:", err);
        showToast('提取页面失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-export mr-2"></i>提取选中页面并导出'; }
    }
}

// 全部拆分为单页打包 ZIP
async function executeSplitAllZip() {
    if (!state.splitBytes || !window.JSZip) {
        showToast('系统组件未就绪', 'error');
        return;
    }
    const btn = document.getElementById('btnSplitAllZip');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在逐页拆分打包...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const srcDoc = await PDFDocument.load(state.splitBytes);
        const total = srcDoc.getPageCount();
        const zip = new window.JSZip();
        const baseName = state.splitFilename.replace(/\.pdf$/i, '');

        for (let i = 0; i < total; i++) {
            const pageDoc = await PDFDocument.create();
            const [copied] = await pageDoc.copyPages(srcDoc, [i]);
            pageDoc.addPage(copied);
            const bytes = await pageDoc.save();
            const padNum = String(i + 1).padStart(3, '0');
            zip.file(`${baseName}_page_${padNum}.pdf`, bytes);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${baseName}_split_pages.zip`);
        showToast(`已成功拆分全部 ${total} 页并打包 ZIP！`, 'success');
    } catch (err) {
        console.error("全量拆分失败:", err);
        showToast('拆分打包失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-archive mr-2"></i>全部拆为单页 (ZIP 打包)'; }
    }
}

/* ========================================================
 * 3. 模块二：格式互转中心 (Convert)
 * ======================================================== */

// 3.1 PDF 转高清图片
async function loadPdfForConvert(file) {
    try {
        ensurePdfJsWorker();
        if (state.pdfToImgDoc) {
            try { state.pdfToImgDoc.destroy(); } catch (e) {}
            state.pdfToImgDoc = null;
        }
        state.pdfToImgFilename = file.name;
        const arrayBuffer = await file.arrayBuffer();
        state.pdfToImgDoc = await window.pdfjsLib.getDocument({
            data: arrayBuffer,
            isEvalSupported: false
        }).promise;
        state.pdfToImgTotalPages = state.pdfToImgDoc.numPages;

        const info = document.getElementById('pdfToImgFileInfo');
        const actions = document.getElementById('pdfToImgActions');
        const previewWrap = document.getElementById('pdfToImgPreviewList');
        
        if (info) {
            info.innerHTML = `
                <div class="p-4 bg-indigo-50/70 dark:bg-slate-800/70 rounded-2xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${escapeHtml(file.name)}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${formatBytes(file.size)} · 共 ${state.pdfToImgTotalPages} 页</p>
                    </div>
                    <span class="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold">可导出</span>
                </div>
            `;
        }
        if (actions) actions.classList.remove('hidden');
        if (previewWrap) {
            previewWrap.classList.remove('hidden');
            previewWrap.innerHTML = `<div class="col-span-full py-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin text-xl mb-1"></i><p>正在生成前置预览图...</p></div>`;
            renderPdfToImgPreviews();
        }
        showToast(`已成功加载 PDF 共 ${state.pdfToImgTotalPages} 页`, 'success');
    } catch (err) {
        console.error("加载 PDF 转换失败:", err);
        showToast('加载失败: ' + err.message, 'error');
    }
}

async function renderPdfToImgPreviews() {
    const container = document.getElementById('pdfToImgPreviewList');
    if (!container || !state.pdfToImgDoc) return;
    container.innerHTML = '';

    const maxPreview = Math.min(6, state.pdfToImgTotalPages);
    for (let i = 1; i <= maxPreview; i++) {
        const page = await state.pdfToImgDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const card = document.createElement('div');
        card.className = "bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-3 shadow-sm flex flex-col items-center";
        card.innerHTML = `
            <div class="w-full flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-gray-600 dark:text-gray-400">第 ${i} 页</span>
                <button type="button" class="btn-dl-single text-xs text-indigo-600 hover:text-indigo-700 font-medium"><i class="fas fa-download mr-1"></i>下载</button>
            </div>
            <div class="w-full h-40 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800">
                <img src="${canvas.toDataURL('image/jpeg', 0.8)}" class="max-h-full max-w-full object-contain" alt="Page ${i}">
            </div>
        `;

        card.querySelector('.btn-dl-single').onclick = async () => {
            await downloadSinglePdfPageAsImage(i);
        };
        container.appendChild(card);
    }
}

// 导出单页图片
async function downloadSinglePdfPageAsImage(pageNum) {
    if (!state.pdfToImgDoc) return;
    try {
        const page = await state.pdfToImgDoc.getPage(pageNum);
        const scale = state.pdfToImgDpi;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

        const ext = state.pdfToImgFormat === 'image/jpeg' ? 'jpg' : (state.pdfToImgFormat === 'image/webp' ? 'webp' : 'png');
        const baseName = state.pdfToImgFilename.replace(/\.pdf$/i, '');
        canvas.toBlob((blob) => {
            downloadBlob(blob, `${baseName}_page_${pageNum}.${ext}`);
            showToast(`已下载第 ${pageNum} 页图片`, 'success');
        }, state.pdfToImgFormat, 0.92);
    } catch (err) {
        showToast('导出图片失败: ' + err.message, 'error');
    }
}

// 一键打包 ZIP 下载全部图片
async function executePdfToImagesZip() {
    if (!state.pdfToImgDoc || !window.JSZip) {
        showToast('系统组件未就绪', 'error');
        return;
    }
    const btn = document.getElementById('btnPdfToImgZip');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在渲染并打包...'; }

    try {
        const zip = new window.JSZip();
        const baseName = state.pdfToImgFilename.replace(/\.pdf$/i, '');
        const ext = state.pdfToImgFormat === 'image/jpeg' ? 'jpg' : (state.pdfToImgFormat === 'image/webp' ? 'webp' : 'png');
        const scale = state.pdfToImgDpi;

        for (let i = 1; i <= state.pdfToImgTotalPages; i++) {
            if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>正在渲染第 ${i} / ${state.pdfToImgTotalPages} 页...`;
            const page = await state.pdfToImgDoc.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

            const blob = await new Promise(resolve => canvas.toBlob(resolve, state.pdfToImgFormat, 0.92));
            const padNum = String(i).padStart(3, '0');
            zip.file(`${baseName}_page_${padNum}.${ext}`, blob);
        }

        if (btn) btn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i>正在生成 ZIP 压缩包...`;
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${baseName}_images_${scale}x.zip`);
        showToast(`已成功打包 ${state.pdfToImgTotalPages} 张高清图片！`, 'success');
    } catch (err) {
        console.error("批量导出图片失败:", err);
        showToast('批量导出失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-archive mr-2"></i>一键打包下载全部图片 (ZIP)'; }
    }
}

// 3.2 多图批量合成 PDF
async function handleAddImagesForPdf(files) {
    for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const reader = new FileReader();
        const dataUrl = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
        state.imgToPdfFiles.push({
            id: `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            file,
            name: file.name,
            size: file.size,
            dataUrl
        });
    }
    renderImgToPdfList();
}

function renderImgToPdfList() {
    const container = document.getElementById('imgToPdfList');
    const emptyState = document.getElementById('imgToPdfEmpty');
    const actions = document.getElementById('imgToPdfActions');
    if (!container) return;

    if (state.imgToPdfFiles.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        if (actions) actions.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (actions) actions.classList.remove('hidden');
    container.innerHTML = '';

    state.imgToPdfFiles.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = "relative bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-3 shadow-sm flex flex-col items-center group";
        card.innerHTML = `
            <div class="w-full flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-gray-500">#${index + 1}</span>
                <button type="button" class="btn-del text-red-500 hover:text-red-700 text-xs"><i class="fas fa-trash-alt"></i></button>
            </div>
            <div class="w-full h-32 flex items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 mb-2">
                <img src="${item.dataUrl}" class="max-h-full max-w-full object-contain" alt="img">
            </div>
            <p class="text-xs text-gray-700 dark:text-gray-300 font-medium truncate w-full text-center" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</p>
            <div class="flex items-center gap-1 mt-2">
                <button type="button" class="btn-up p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fas fa-arrow-left text-[10px]"></i></button>
                <button type="button" class="btn-down p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 ${index === state.imgToPdfFiles.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}"><i class="fas fa-arrow-right text-[10px]"></i></button>
            </div>
        `;

        card.querySelector('.btn-del').onclick = () => {
            state.imgToPdfFiles.splice(index, 1);
            renderImgToPdfList();
        };
        card.querySelector('.btn-up').onclick = () => {
            if (index > 0) {
                const temp = state.imgToPdfFiles[index];
                state.imgToPdfFiles[index] = state.imgToPdfFiles[index - 1];
                state.imgToPdfFiles[index - 1] = temp;
                renderImgToPdfList();
            }
        };
        card.querySelector('.btn-down').onclick = () => {
            if (index < state.imgToPdfFiles.length - 1) {
                const temp = state.imgToPdfFiles[index];
                state.imgToPdfFiles[index] = state.imgToPdfFiles[index + 1];
                state.imgToPdfFiles[index + 1] = temp;
                renderImgToPdfList();
            }
        };

        container.appendChild(card);
    });
}

// 执行图片合成 PDF
async function executeGeneratePdfFromImages() {
    if (state.imgToPdfFiles.length === 0) {
        showToast('请至少添加一张图片', 'warning');
        return;
    }
    const btn = document.getElementById('btnGeneratePdfFromImg');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在合成中...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const outDoc = await PDFDocument.create();

        for (const item of state.imgToPdfFiles) {
            // 将任何格式图片统一加载到 Image 对象并转为 PNG/JPG 字节
            const imgEl = new Image();
            imgEl.src = item.dataUrl;
            await new Promise(r => { imgEl.onload = r; });

            let embeddedImage;
            if (item.file.type === 'image/jpeg' || item.file.type === 'image/jpg') {
                const bytes = await item.file.arrayBuffer();
                embeddedImage = await outDoc.embedJpg(bytes);
            } else {
                // PNG, WebP 等通过 canvas 统一转无损 PNG 嵌入
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgEl.naturalWidth;
                tempCanvas.height = imgEl.naturalHeight;
                const ctx = tempCanvas.getContext('2d');
                ctx.drawImage(imgEl, 0, 0);
                const pngDataUrl = tempCanvas.toDataURL('image/png');
                embeddedImage = await outDoc.embedPng(dataUrlToUint8Array(pngDataUrl));
            }

            const imgWidth = embeddedImage.width;
            const imgHeight = embeddedImage.height;

            if (state.imgToPdfOrientation === 'fit') {
                // 自适应图片尺寸
                const page = outDoc.addPage([imgWidth, imgHeight]);
                page.drawImage(embeddedImage, { x: 0, y: 0, width: imgWidth, height: imgHeight });
            } else {
                // A4 纵向 (595.28 x 841.89) 或 A4 横向 (841.89 x 595.28)
                const isLandscape = state.imgToPdfOrientation === 'a4_l';
                const pageWidth = isLandscape ? 841.89 : 595.28;
                const pageHeight = isLandscape ? 595.28 : 841.89;
                const margin = state.imgToPdfMargin;

                const availWidth = pageWidth - (margin * 2);
                const availHeight = pageHeight - (margin * 2);

                const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
                const drawWidth = imgWidth * scale;
                const drawHeight = imgHeight * scale;
                const drawX = margin + (availWidth - drawWidth) / 2;
                const drawY = margin + (availHeight - drawHeight) / 2;

                const page = outDoc.addPage([pageWidth, pageHeight]);
                page.drawImage(embeddedImage, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
            }
        }

        const outBytes = await outDoc.save();
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `images_combined_${Date.now()}.pdf`);
        showToast(`成功将 ${state.imgToPdfFiles.length} 张图片合成为 PDF！`, 'success');
    } catch (err) {
        console.error("合成 PDF 失败:", err);
        showToast('合成失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-pdf mr-2"></i>一键合成并下载 PDF'; }
    }
}

/* ========================================================
 * 4. 模块三：安全防护与标注 (Security)
 * ======================================================== */

// 加载 PDF 用于安全工具
async function loadPdfForSecurity(file) {
    try {
        ensurePdfJsWorker();
        if (state.securityPdfjsDoc) {
            try { state.securityPdfjsDoc.destroy(); } catch (e) {}
            state.securityPdfjsDoc = null;
        }
        state.securityFilename = file.name;
        state.securityBytes = await file.arrayBuffer();
        
        const { PDFDocument } = window.PDFLib;
        state.securityDoc = await PDFDocument.load(state.securityBytes.slice(0), { updateMetadata: false });
        state.securityPdfjsDoc = await window.pdfjsLib.getDocument({
            data: state.securityBytes.slice(0),
            isEvalSupported: false
        }).promise;
        state.securityTotalPages = state.securityPdfjsDoc.numPages;

        // 安全读取元数据 (避免 pdf-lib getKeywords() 为 string 时 .join 抛 TypeError)
        let kwText = '（无）';
        try {
            const rawKw = state.securityDoc.getKeywords();
            if (Array.isArray(rawKw)) {
                kwText = rawKw.join(', ') || '（无）';
            } else if (typeof rawKw === 'string') {
                kwText = rawKw.trim() || '（无）';
            }
        } catch (e) {}

        let creationDateStr = '（无）';
        try {
            const cDate = state.securityDoc.getCreationDate();
            if (cDate instanceof Date && !isNaN(cDate.getTime())) {
                creationDateStr = cDate.toLocaleString();
            }
        } catch (e) {}

        let modDateStr = '（无）';
        try {
            const mDate = state.securityDoc.getModificationDate();
            if (mDate instanceof Date && !isNaN(mDate.getTime())) {
                modDateStr = mDate.toLocaleString();
            }
        } catch (e) {}

        state.currentMetadata = {
            title: state.securityDoc.getTitle() || '（无）',
            author: state.securityDoc.getAuthor() || '（无）',
            subject: state.securityDoc.getSubject() || '（无）',
            keywords: kwText,
            producer: state.securityDoc.getProducer() || '（无）',
            creator: state.securityDoc.getCreator() || '（无）',
            creationDate: creationDateStr,
            modificationDate: modDateStr
        };

        const info = document.getElementById('securityFileInfo');
        const panels = document.getElementById('securityToolPanels');
        if (info) {
            info.innerHTML = `
                <div class="p-4 bg-indigo-50/70 dark:bg-slate-800/70 rounded-2xl border border-indigo-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                        <p class="font-bold text-gray-800 dark:text-gray-200 text-sm">${escapeHtml(file.name)}</p>
                        <p class="text-xs text-gray-500 mt-0.5">${formatBytes(file.size)} · 共 ${state.securityTotalPages} 页</p>
                    </div>
                    <span class="px-3 py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold">已载入</span>
                </div>
            `;
        }
        if (panels) panels.classList.remove('hidden');
        renderMetadataTable();
        updateSecurityPreview();
        showToast(`已加载文档 ${file.name}`, 'success');
    } catch (err) {
        console.error("载入文档失败:", err);
        showToast('载入文档失败: ' + err.message, 'error');
    }
}

// 实时更新安全工具预览（Page 1 + 水印/页码）
async function updateSecurityPreview() {
    const canvas = document.getElementById('securityPreviewCanvas');
    if (!canvas || !state.securityPdfjsDoc) return;

    try {
        const page = await state.securityPdfjsDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        if (state.securityMode === 'watermark') {
            drawWatermarkOnContext(ctx, canvas.width, canvas.height);
        } else if (state.securityMode === 'page_number') {
            drawPageNumberOnContext(ctx, canvas.width, canvas.height, 1, state.securityTotalPages);
        }
    } catch (err) {
        console.error("更新预览失败:", err);
    }
}

// 在 Canvas Context 上绘制倾斜/平铺水印
function drawWatermarkOnContext(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = state.watermarkOpacity;
    ctx.fillStyle = state.watermarkColor;
    ctx.font = `bold ${state.watermarkFontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = state.watermarkText || '';
    if (!text) {
        ctx.restore();
        return;
    }

    if (state.watermarkMode === 'center') {
        ctx.translate(width / 2, height / 2);
        ctx.rotate((state.watermarkAngle * Math.PI) / 180);
        ctx.fillText(text, 0, 0);
    } else {
        // 倾斜平铺矩阵
        ctx.translate(width / 2, height / 2);
        ctx.rotate((state.watermarkAngle * Math.PI) / 180);
        ctx.translate(-width / 2, -height / 2);

        const stepX = Math.max(160, state.watermarkFontSize * 8);
        const stepY = Math.max(120, state.watermarkFontSize * 4);

        for (let x = -width; x < width * 2; x += stepX) {
            for (let y = -height; y < height * 2; y += stepY) {
                ctx.fillText(text, x, y);
            }
        }
    }
    ctx.restore();
}

// 在 Canvas Context 上绘制页码
function drawPageNumberOnContext(ctx, width, height, current, total) {
    ctx.save();
    ctx.fillStyle = state.pageNumberColor;
    ctx.font = `${state.pageNumberFontSize}px sans-serif`;

    const label = state.pageNumberFormat
        .replace('{page}', current)
        .replace('{total}', total);

    const margin = state.pageNumberMargin;
    let x = width / 2;
    let y = height - margin;
    let align = 'center';

    switch (state.pageNumberPosition) {
        case 'bottom_center':
            x = width / 2; y = height - margin; align = 'center'; break;
        case 'bottom_right':
            x = width - margin; y = height - margin; align = 'right'; break;
        case 'bottom_left':
            x = margin; y = height - margin; align = 'left'; break;
        case 'top_center':
            x = width / 2; y = margin + state.pageNumberFontSize; align = 'center'; break;
        case 'top_right':
            x = width - margin; y = margin + state.pageNumberFontSize; align = 'right'; break;
    }

    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
    ctx.restore();
}

// 生成透明水印 PNG 图层
function generateWatermarkPng(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawWatermarkOnContext(ctx, width, height);
    return dataUrlToUint8Array(canvas.toDataURL('image/png'));
}

// 生成透明页码 PNG 图层
function generatePageNumberPng(width, height, pageNum, total) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawPageNumberOnContext(ctx, width, height, pageNum, total);
    return dataUrlToUint8Array(canvas.toDataURL('image/png'));
}

// 应用防伪水印并导出
async function executeApplyWatermark() {
    if (!state.securityBytes) return;
    const btn = document.getElementById('btnApplyWatermark');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在加注水印...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.load(state.securityBytes);
        const total = doc.getPageCount();

        for (let i = 0; i < total; i++) {
            const page = doc.getPage(i);
            const { width, height } = page.getSize();
            // 光栅化生成与页面尺寸完全一致的透明 PNG 图层 (避免中文字体缺失)
            const watermarkPngBytes = generateWatermarkPng(width, height);
            const embeddedPng = await doc.embedPng(watermarkPngBytes);
            page.drawImage(embeddedPng, { x: 0, y: 0, width, height });
        }

        const outBytes = await doc.save();
        const baseName = state.securityFilename.replace(/\.pdf$/i, '');
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `${baseName}_watermarked.pdf`);
        showToast(`已成功为全部 ${total} 页加注防伪水印！`, 'success');
    } catch (err) {
        console.error("加注水印失败:", err);
        showToast('加注水印失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-stamp mr-2"></i>应用水印并导出 PDF'; }
    }
}

// 批量添加页码并导出
async function executeApplyPageNumbers() {
    if (!state.securityBytes) return;
    const btn = document.getElementById('btnApplyPageNumbers');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在插入页码...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.load(state.securityBytes);
        const total = doc.getPageCount();

        for (let i = 0; i < total; i++) {
            const page = doc.getPage(i);
            const { width, height } = page.getSize();
            const pageNumPngBytes = generatePageNumberPng(width, height, i + 1, total);
            const embeddedPng = await doc.embedPng(pageNumPngBytes);
            page.drawImage(embeddedPng, { x: 0, y: 0, width, height });
        }

        const outBytes = await doc.save();
        const baseName = state.securityFilename.replace(/\.pdf$/i, '');
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `${baseName}_numbered.pdf`);
        showToast(`已成功为全部 ${total} 页添加页码！`, 'success');
    } catch (err) {
        console.error("添加页码失败:", err);
        showToast('添加页码失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sort-numeric-down mr-2"></i>添加页码并导出 PDF'; }
    }
}

// 渲染元数据表格
function renderMetadataTable() {
    const tbody = document.getElementById('pdfMetadataTableBody');
    if (!tbody || !state.currentMetadata) return;

    const fields = [
        { label: '文档标题 (Title)', key: 'title' },
        { label: '作者信息 (Author)', key: 'author' },
        { label: '文档主题 (Subject)', key: 'subject' },
        { label: '关键词 (Keywords)', key: 'keywords' },
        { label: '创建软件 (Creator)', key: 'creator' },
        { label: '制作程序 (Producer)', key: 'producer' },
        { label: '创建时间 (Created)', key: 'creationDate' },
        { label: '修改时间 (Modified)', key: 'modificationDate' }
    ];

    tbody.innerHTML = fields.map(f => `
        <tr class="border-b border-gray-100 dark:border-slate-800">
            <td class="py-2.5 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 w-1/3">${escapeHtml(f.label)}</td>
            <td class="py-2.5 px-3 text-xs font-mono text-gray-800 dark:text-gray-200 truncate max-w-xs">${escapeHtml(state.currentMetadata[f.key])}</td>
        </tr>
    `).join('');
}

// 清理隐私元数据并导出
async function executeCleanMetadata() {
    if (!state.securityBytes) return;
    const btn = document.getElementById('btnCleanMetadata');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>正在清理脱敏...'; }

    try {
        const { PDFDocument } = window.PDFLib;
        const doc = await PDFDocument.load(state.securityBytes);

        // 彻底擦除敏感信息
        doc.setTitle('');
        doc.setAuthor('');
        doc.setSubject('');
        doc.setKeywords([]);
        doc.setProducer('');
        doc.setCreator('');

        const outBytes = await doc.save();
        const baseName = state.securityFilename.replace(/\.pdf$/i, '');
        downloadBlob(new Blob([outBytes], { type: 'application/pdf' }), `${baseName}_sanitized.pdf`);
        showToast('已彻底清除文档中的所有作者、标题与制作痕迹！', 'success');
    } catch (err) {
        console.error("清除元数据失败:", err);
        showToast('清理元数据失败: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-user-secret mr-2"></i>一键脱敏并导出干净 PDF'; }
    }
}

/* ========================================================
 * 5. 全局初始化与事件监听绑定
 * ======================================================== */

export function initPdfTools() {
    ensurePdfJsWorker();

    // 绑定顶部子标签页切换
    ['organize', 'convert', 'security'].forEach(tab => {
        const btn = document.getElementById(`pdf-tab-btn-${tab}`);
        if (btn) btn.onclick = () => switchPdfTab(tab);
    });

    // 绑定组织子模式
    ['organizer', 'merge', 'split'].forEach(mode => {
        const btn = document.getElementById(`btn-mode-${mode}`);
        if (btn) btn.onclick = () => switchOrganizeSubMode(mode);
    });

    // 绑定转换子模式
    ['pdf_to_img', 'img_to_pdf'].forEach(mode => {
        const btn = document.getElementById(`btn-convert-${mode}`);
        if (btn) btn.onclick = () => switchConvertSubMode(mode);
    });

    // 绑定安全子模式
    ['watermark', 'page_number', 'metadata'].forEach(mode => {
        const btn = document.getElementById(`btn-security-${mode}`);
        if (btn) btn.onclick = () => switchSecuritySubMode(mode);
    });

    /* --- 上传区绑定 --- */

    // 1. Organizer 上传
    const orgInput = document.getElementById('pdfOrganizerInput');
    const orgZone = document.getElementById('pdfOrganizerDropzone');
    if (orgInput) {
        orgInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                loadPdfForOrganizer(e.target.files[0]);
            }
        };
    }
    setupDropzone(orgZone, orgInput, (file) => loadPdfForOrganizer(file));

    // 2. Merge 上传
    const mergeInput = document.getElementById('pdfMergeInput');
    const mergeZone = document.getElementById('pdfMergeDropzone');
    if (mergeInput) {
        mergeInput.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleAddMergeFiles(Array.from(e.target.files));
            }
        };
    }
    setupDropzone(mergeZone, mergeInput, null, (files) => handleAddMergeFiles(files));

    // 3. Split 上传
    const splitInput = document.getElementById('pdfSplitInput');
    const splitZone = document.getElementById('pdfSplitDropzone');
    if (splitInput) {
        splitInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                loadPdfForSplit(e.target.files[0]);
            }
        };
    }
    setupDropzone(splitZone, splitInput, (file) => loadPdfForSplit(file));

    // 4. PDF to Img 上传
    const pdfToImgInput = document.getElementById('pdfToImgInput');
    const pdfToImgZone = document.getElementById('pdfToImgDropzone');
    if (pdfToImgInput) {
        pdfToImgInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                loadPdfForConvert(e.target.files[0]);
            }
        };
    }
    setupDropzone(pdfToImgZone, pdfToImgInput, (file) => loadPdfForConvert(file));

    // 5. Img to PDF 上传
    const imgToPdfInput = document.getElementById('imgToPdfInput');
    const imgToPdfZone = document.getElementById('imgToPdfDropzone');
    if (imgToPdfInput) {
        imgToPdfInput.onchange = (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleAddImagesForPdf(Array.from(e.target.files));
            }
        };
    }
    setupDropzone(imgToPdfZone, imgToPdfInput, null, (files) => handleAddImagesForPdf(files));

    // 6. Security 上传
    const secInput = document.getElementById('pdfSecurityInput');
    const secZone = document.getElementById('pdfSecurityDropzone');
    if (secInput) {
        secInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) {
                loadPdfForSecurity(e.target.files[0]);
            }
        };
    }
    setupDropzone(secZone, secInput, (file) => loadPdfForSecurity(file));

    /* --- 按钮事件绑定 --- */

    // 页面排版操作
    const btnExportOrg = document.getElementById('btnExportOrganizedPdf');
    if (btnExportOrg) btnExportOrg.onclick = exportOrganizedPdf;
    const btnRotateAllCcw = document.getElementById('btnRotateAllCcw');
    if (btnRotateAllCcw) {
        btnRotateAllCcw.onclick = () => {
            state.organizerPages.forEach(p => { p.rotation = (p.rotation - 90 + 360) % 360; });
            renderOrganizerCards();
        };
    }
    const btnRotateAllCw = document.getElementById('btnRotateAllCw');
    if (btnRotateAllCw) {
        btnRotateAllCw.onclick = () => {
            state.organizerPages.forEach(p => { p.rotation = (p.rotation + 90) % 360; });
            renderOrganizerCards();
        };
    }

    // 合并与拆分
    const btnMerge = document.getElementById('btnExecuteMerge');
    if (btnMerge) btnMerge.onclick = executeMergePdfs;
    const btnExtractSplit = document.getElementById('btnExtractSplit');
    if (btnExtractSplit) btnExtractSplit.onclick = executeExtractSplit;
    const btnSplitAllZip = document.getElementById('btnSplitAllZip');
    if (btnSplitAllZip) btnSplitAllZip.onclick = executeSplitAllZip;

    // 格式互转
    const btnPdfToImgZip = document.getElementById('btnPdfToImgZip');
    if (btnPdfToImgZip) btnPdfToImgZip.onclick = executePdfToImagesZip;
    const btnGeneratePdfFromImg = document.getElementById('btnGeneratePdfFromImg');
    if (btnGeneratePdfFromImg) btnGeneratePdfFromImg.onclick = executeGeneratePdfFromImages;

    // 格式与 DPI 切换
    const selDpi = document.getElementById('selectPdfToImgDpi');
    if (selDpi) {
        selDpi.onchange = (e) => { state.pdfToImgDpi = parseFloat(e.target.value); };
    }
    const selFmt = document.getElementById('selectPdfToImgFormat');
    if (selFmt) {
        selFmt.onchange = (e) => { state.pdfToImgFormat = e.target.value; };
    }
    const selOrient = document.getElementById('selectImgToPdfOrientation');
    if (selOrient) {
        selOrient.onchange = (e) => { state.imgToPdfOrientation = e.target.value; };
    }
    const selMargin = document.getElementById('selectImgToPdfMargin');
    if (selMargin) {
        selMargin.onchange = (e) => { state.imgToPdfMargin = parseInt(e.target.value, 10); };
    }

    // 水印与页码控件响应
    const inputWmText = document.getElementById('wmTextInput');
    if (inputWmText) {
        inputWmText.oninput = (e) => {
            state.watermarkText = e.target.value;
            updateSecurityPreview();
        };
    }
    const rangeWmAngle = document.getElementById('wmAngleRange');
    const valWmAngle = document.getElementById('wmAngleValue');
    if (rangeWmAngle) {
        rangeWmAngle.oninput = (e) => {
            state.watermarkAngle = parseInt(e.target.value, 10);
            if (valWmAngle) valWmAngle.textContent = `${state.watermarkAngle}°`;
            updateSecurityPreview();
        };
    }
    const rangeWmOpacity = document.getElementById('wmOpacityRange');
    const valWmOpacity = document.getElementById('wmOpacityValue');
    if (rangeWmOpacity) {
        rangeWmOpacity.oninput = (e) => {
            state.watermarkOpacity = parseFloat(e.target.value);
            if (valWmOpacity) valWmOpacity.textContent = `${Math.round(state.watermarkOpacity * 100)}%`;
            updateSecurityPreview();
        };
    }
    const rangeWmSize = document.getElementById('wmSizeRange');
    const valWmSize = document.getElementById('wmSizeValue');
    if (rangeWmSize) {
        rangeWmSize.oninput = (e) => {
            state.watermarkFontSize = parseInt(e.target.value, 10);
            if (valWmSize) valWmSize.textContent = `${state.watermarkFontSize}px`;
            updateSecurityPreview();
        };
    }
    const colorWm = document.getElementById('wmColorInput');
    if (colorWm) {
        colorWm.oninput = (e) => {
            state.watermarkColor = e.target.value;
            updateSecurityPreview();
        };
    }
    const selWmMode = document.getElementById('wmModeSelect');
    if (selWmMode) {
        selWmMode.onchange = (e) => {
            state.watermarkMode = e.target.value;
            updateSecurityPreview();
        };
    }

    // 水印快捷短语
    document.querySelectorAll('.btn-wm-preset').forEach(btn => {
        btn.onclick = () => {
            const text = btn.dataset.text || btn.textContent.trim();
            state.watermarkText = text;
            if (inputWmText) inputWmText.value = text;
            updateSecurityPreview();
        };
    });

    // 页码控件
    const selPageFmt = document.getElementById('pageNumFormatSelect');
    if (selPageFmt) {
        selPageFmt.onchange = (e) => {
            state.pageNumberFormat = e.target.value;
            updateSecurityPreview();
        };
    }
    const selPagePos = document.getElementById('pageNumPositionSelect');
    if (selPagePos) {
        selPagePos.onchange = (e) => {
            state.pageNumberPosition = e.target.value;
            updateSecurityPreview();
        };
    }
    const rangePageMargin = document.getElementById('pageNumMarginRange');
    const valPageMargin = document.getElementById('pageNumMarginVal');
    if (rangePageMargin) {
        rangePageMargin.oninput = (e) => {
            state.pageNumberMargin = parseInt(e.target.value, 10);
            if (valPageMargin) valPageMargin.textContent = `${state.pageNumberMargin}pt`;
            updateSecurityPreview();
        };
    }

    // 安全功能执行按钮
    const btnApplyWm = document.getElementById('btnApplyWatermark');
    if (btnApplyWm) btnApplyWm.onclick = executeApplyWatermark;
    const btnApplyPageNum = document.getElementById('btnApplyPageNumbers');
    if (btnApplyPageNum) btnApplyPageNum.onclick = executeApplyPageNumbers;
    const btnCleanMeta = document.getElementById('btnCleanMetadata');
    if (btnCleanMeta) btnCleanMeta.onclick = executeCleanMetadata;

    // 默认展示第一子选项卡
    switchPdfTab('organize');
    switchOrganizeSubMode('organizer');
    switchConvertSubMode('pdf_to_img');
    switchSecuritySubMode('watermark');

    // 将常用方法挂载至 window 供可能存在的内联调用
    window.switchPdfTab = switchPdfTab;
    window.switchOrganizeSubMode = switchOrganizeSubMode;
    window.switchConvertSubMode = switchConvertSubMode;
    window.switchSecuritySubMode = switchSecuritySubMode;

    console.log("[PdfTools] PDF Magic Studio initialized successfully.");
}

// 辅助拖拽绑定
function setupDropzone(zone, input, singleCb, multiCb) {
    if (!zone) return;
    zone.onclick = () => { if (input) input.click(); };
    zone.ondragover = (e) => {
        e.preventDefault();
        zone.classList.add('drag-active');
    };
    zone.ondragleave = () => {
        zone.classList.remove('drag-active');
    };
    zone.ondrop = (e) => {
        e.preventDefault();
        zone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            if (multiCb) {
                multiCb(Array.from(e.dataTransfer.files));
            } else if (singleCb) {
                singleCb(e.dataTransfer.files[0]);
            }
        }
    };
}
