// js/ocr.js
import { showToast, validateFile } from './utils.js';
import { t } from './i18n.js';

let ocrInput = null;
let ocrFileStatus = null;
let ocrEngineIndicator = null;
let ocrEngineStatusTitle = null;
let ocrEngineStatusDesc = null;
let ocrPdfControls = null;
let ocrPdfPrevBtn = null;
let ocrPdfNextBtn = null;
let ocrPdfPageNum = null;
let ocrPdfAllBtn = null;
let ocrStartBtn = null;
let ocrPlaceholder = null;
let ocrPreviewCanvas = null;
let ocrOverlayLayer = null;
let ocrCanvasContainer = null;
let ocrTabBtnPreview = null;
let ocrTabBtnText = null;
let ocrTabContentPreview = null;
let ocrTabContentText = null;
let ocrResultTextarea = null;
let ocrCopyBtn = null;
let ocrExportTxtBtn = null;
let ocrExportWordBtn = null;
let ocrExportExcelBtn = null;

let ocrEngine = null;
let isEngineReady = false;
let isEngineLoading = false;
let selectedFile = null;
let fileType = '';
let pdfDoc = null;
let currentPdfPage = 1;
let totalPdfPages = 0;
let recognitionResults = {};

window.addEventListener('locale-changed', () => {
    if (isEngineReady) {
        if (ocrEngineStatusTitle) ocrEngineStatusTitle.textContent = t('ocr.engine_ready_title') || 'OCR 引擎就绪';
        if (ocrEngineStatusDesc) ocrEngineStatusDesc.textContent = t('ocr.engine_ready_desc') || '已成功在本地加载 PP-OCRv6 离线模型，支持本地毫秒级识别。';
    }
});

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==============================================================================
// OCR 离线模型下载源配置 (方案 A：阿里魔搭 ModelScope 极速免流加速)
// 默认支持国内顶级 BGP 极速直链；若未配置或下载失败，自动无缝回退至本站源
// ==============================================================================
const OCR_MODEL_SOURCES = {
    // 获取魔搭仓库标识 (优先使用全局变量，其次使用本站配置缓存，最后为硬编码)
    getRepo() {
        if (window.MODELSCOPE_OCR_REPO && window.MODELSCOPE_OCR_REPO.trim()) {
            return window.MODELSCOPE_OCR_REPO.trim();
        }
        try {
            const cached = localStorage.getItem('cache_site_config');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed.ocr_modelscope_repo && parsed.ocr_modelscope_repo.trim()) {
                    return parsed.ocr_modelscope_repo.trim();
                }
            }
        } catch (e) {}
        return "";
    },

    localBase: "/models",

    getUrl(filename) {
        const repo = this.getRepo();
        if (repo) {
            // 1. 若输入了完整 URL 前缀，直接拼接文件名
            if (repo.startsWith("http://") || repo.startsWith("https://")) {
                return `${repo.replace(/\/$/, '')}/${filename}`;
            }
            // 2. 若显式指定了 datasets/ 或 models/ 前缀
            if (repo.startsWith("datasets/") || repo.startsWith("models/")) {
                return `https://www.modelscope.cn/${repo}/resolve/master/${filename}`;
            }
            // 3. 默认作为模型库 (models) 路径解析
            return `https://www.modelscope.cn/models/${repo}/resolve/master/${filename}`;
        }
        return `${this.localBase}/${filename}`;
    }
};

async function fetchWithProgress(url, onProgress) {
    const cacheName = 'ocr-models-cache-v1';
    let cache;
    if ('caches' in window) {
        try {
            cache = await caches.open(cacheName);
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                const cachedBlob = await cachedResponse.blob();
                const headerSlice = await cachedBlob.slice(0, 100).text();
                // 确保缓存的不是错误页面或损坏文件 (正常 det.tar/rec.tar 均大于 5MB，且绝不包含 HTML 标签)
                if (cachedBlob.size > 1000000 && !headerSlice.includes("<!DOCTYPE") && !headerSlice.includes("<html")) {
                    if (onProgress) onProgress("100% (本地磁盘高速缓存)");
                    return cachedBlob;
                } else {
                    console.warn(`[OCR Cache] 检测到异常缓存 (${url}, 大小: ${cachedBlob.size})，已自动清除坏缓存。`);
                    if (cache) await cache.delete(url);
                }
            }
        } catch (e) {
            console.warn("[OCR Cache] CacheStorage open error:", e);
        }
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`加载模型失败：HTTP 错误码 ${response.status} (${url})`);
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    let loaded = 0;
    const reader = response.body.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (onProgress) {
            if (total > 0) {
                const percent = Math.round((loaded / total) * 100);
                onProgress(`${percent}% (${(loaded / 1048576).toFixed(1)}MB / ${(total / 1048576).toFixed(1)}MB)`);
            } else {
                onProgress(`已下载 ${(loaded / 1048576).toFixed(1)} MB`);
            }
        }
    }

    const blob = new Blob(chunks);
    
    // 校验文件合法性：防止下载到 404 HTML 网页或非 tar 压缩包
    const headerSlice = await blob.slice(0, 100).text();
    if (headerSlice.includes("<!DOCTYPE") || headerSlice.includes("<html") || blob.size < 1000000) {
        throw new Error(`下载到的模型包无效 (${formatBytes(blob.size)})，返回了网页而非真实模型数据`);
    }

    if (cache) {
        try {
            await cache.put(url, new Response(blob));
        } catch (e) {
            console.warn("[OCR Cache] CacheStorage write error:", e);
        }
    }
    return blob;
}

async function loadModelWithFallback(filename, onProgress) {
    const repo = OCR_MODEL_SOURCES.getRepo();
    const primaryUrl = OCR_MODEL_SOURCES.getUrl(filename);
    const fallbackUrl = `${OCR_MODEL_SOURCES.localBase}/${filename}`;

    try {
        return await fetchWithProgress(primaryUrl, onProgress);
    } catch (err) {
        if (repo && primaryUrl !== fallbackUrl) {
            console.warn(`[OCR] 远端魔搭源下载 ${filename} 异常，正在自动回退至本站备用源...`, err);
            if (ocrEngineStatusDesc) {
                ocrEngineStatusDesc.textContent = `魔搭加速源连接异常，正在自动切换至本站备用源重试...`;
            }
            return await fetchWithProgress(fallbackUrl, onProgress);
        }
        throw err;
    }
}

async function startOcrEngine() {
    if (isEngineReady || isEngineLoading) return;
    isEngineLoading = true;
    try {
        ocrEngineIndicator.className = 'w-3.5 h-3.5 rounded-full bg-amber-500 animate-pulse';
        const isModelScope = Boolean(OCR_MODEL_SOURCES.getRepo());
        const sourceLabel = isModelScope ? "阿里魔搭极速源" : "云主机";

        ocrEngineStatusTitle.textContent = '正在加载检测模型 (det.tar)...';
        const detBlob = await loadModelWithFallback('det.tar', (p) => {
            ocrEngineStatusDesc.textContent = `正在从${sourceLabel}下载检测模型: ${p}`;
        });
        const detUrl = URL.createObjectURL(detBlob);

        ocrEngineStatusTitle.textContent = '正在加载识别模型 (rec.tar)...';
        const recBlob = await loadModelWithFallback('rec.tar', (p) => {
            ocrEngineStatusDesc.textContent = `正在从${sourceLabel}下载识别模型: ${p}`;
        });
        const recUrl = URL.createObjectURL(recBlob);

        ocrEngineStatusTitle.textContent = '正在初始化 OCR 推理引擎...';
        ocrEngineStatusDesc.textContent = '正在载入 WASM 深度学习引擎并解析识别模型，首次加载可能需要几十秒，请稍候...';
        const { PaddleOCR } = await import('/models/paddleocr.js?v=3.1');
        
        const ocrCreateOptions = {
            textDetectionModelName: "PP-OCRv6_small_det",
            textDetectionModelAsset: { url: detUrl },
            textRecognitionModelName: "PP-OCRv6_small_rec",
            textRecognitionModelAsset: { url: recUrl },
            ortOptions: {
                backend: "wasm",
                wasmPaths: {
                    mjs: "/models/ort-wasm-simd-threaded.jsep.mjs?v=3",
                    wasm: "/models/ort-wasm-simd-threaded.jsep.wasm?v=3"
                }
            }
        };

        // 采用 Web Worker 后台独立线程模式（OpenCV 完整内嵌在 Worker 中，绝不占用或卡死主线程）
        ocrEngine = await PaddleOCR.create({
            ...ocrCreateOptions,
            worker: true
        });

        isEngineReady = true;
        ocrEngineIndicator.className = 'w-3.5 h-3.5 rounded-full bg-green-500';
        ocrEngineStatusTitle.textContent = t('ocr.engine_ready_title') || 'OCR 引擎就绪';
        ocrEngineStatusDesc.textContent = t('ocr.engine_ready_desc') || '已成功在本地加载 PP-OCRv6 离线模型，支持本地毫秒级识别。';
        if (selectedFile && ocrStartBtn) { ocrStartBtn.disabled = false; }
    } catch (err) {
        console.error("OCR engine initialization failed:", err);
        ocrEngineIndicator.className = 'w-3.5 h-3.5 rounded-full bg-red-500';
        ocrEngineStatusTitle.textContent = t('ocr.engine_fail_title') || 'OCR 引擎初始化失败';
        let detail = err.message;
        if (!window.isSecureContext || location.protocol !== 'https:') {
            detail += ' (提示：多线程 WebAssembly 需要在 HTTPS 环境下运行，请确保使用 https:// 访问)';
        } else if (typeof SharedArrayBuffer === 'undefined' || !window.crossOriginIsolated) {
            detail += ' (提示：当前浏览器未开启跨域隔离/SharedArrayBuffer，请检查 Nginx COOP/COEP 响应头，或尝试在手机 Chrome/Edge 浏览器中打开)';
        }
        ocrEngineStatusDesc.textContent = detail;
    } finally {
        isEngineLoading = false;
    }
}

export function startOcrEngineLazy() {
    startOcrEngine();
}
window.startOcrEngineLazy = startOcrEngineLazy;

function bindDragAndDropOCR() {
    const dropZone = document.getElementById('ocrDropZone');
    if(!dropZone || !ocrInput) return;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
    });
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-active'), false);
    });
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-active'), false);
    });
    dropZone.addEventListener('drop', (e) => {
        ocrInput.files = e.dataTransfer.files;
        ocrInput.dispatchEvent(new Event('change'));
    });
    dropZone.addEventListener('click', () => { ocrInput.click(); });
    ocrInput.addEventListener('click', (e) => { e.stopPropagation(); });
}

function loadImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                ocrPreviewCanvas.width = img.width;
                ocrPreviewCanvas.height = img.height;
                const ctx = ocrPreviewCanvas.getContext('2d');
                ctx.clearRect(0, 0, img.width, img.height);
                ctx.drawImage(img, 0, 0);
                ocrPreviewCanvas.classList.remove('hidden');
                ocrCanvasContainer.style.width = img.width + 'px';
                ocrCanvasContainer.style.height = img.height + 'px';
                ocrOverlayLayer.style.width = img.width + 'px';
                ocrOverlayLayer.style.height = img.height + 'px';
                resolve();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function loadPdf(file) {
    try {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/models/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await window.pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: '/models/cmaps/',
            cMapPacked: true,
            standardFontDataUrl: '/models/standard_fonts/',
            isEvalSupported: false
        }).promise;
        totalPdfPages = pdfDoc.numPages;
        ocrPdfControls.classList.remove('hidden');
        ocrPdfPageNum.textContent = `第 1 / ${totalPdfPages} 页`;
        await renderPdfPage(1);
    } catch (err) {
        console.error("Failed to load PDF:", err);
        showToast('❌ PDF 加载失败: ' + err.message, 'error');
    }
}

async function renderPdfPage(pageNum) {
    if (!pdfDoc) return;
    ocrPlaceholder.classList.remove('hidden');
    ocrPlaceholder.querySelector('span').textContent = `正在渲染第 ${pageNum} 页...`;
    ocrPreviewCanvas.classList.add('hidden');
    ocrOverlayLayer.innerHTML = '';
    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 });
        ocrPreviewCanvas.width = viewport.width;
        ocrPreviewCanvas.height = viewport.height;
        const ctx = ocrPreviewCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        ocrPlaceholder.classList.add('hidden');
        ocrPreviewCanvas.classList.remove('hidden');
        ocrCanvasContainer.style.width = viewport.width + 'px';
        ocrCanvasContainer.style.height = viewport.height + 'px';
        ocrOverlayLayer.style.width = viewport.width + 'px';
        ocrOverlayLayer.style.height = viewport.height + 'px';
        if (recognitionResults[pageNum]) { drawOverlayBoxes(recognitionResults[pageNum]); }
    } catch (err) {
        console.error("Failed to render PDF page:", err);
        ocrPlaceholder.querySelector('span').textContent = `渲染第 ${pageNum} 页失败: ` + err.message;
    }
}

function drawOverlayBoxes(items) {
    ocrOverlayLayer.innerHTML = '';
    const canvasW = ocrPreviewCanvas.width;
    const canvasH = ocrPreviewCanvas.height;
    items.forEach(item => {
        const xCoords = item.poly.map(p => p[0]);
        const yCoords = item.poly.map(p => p[1]);
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        const width = maxX - minX;
        const height = maxY - minY;
        const leftPct = (minX / canvasW) * 100;
        const topPct = (minY / canvasH) * 100;
        const widthPct = (width / canvasW) * 100;
        const heightPct = (height / canvasH) * 100;
        const boxDiv = document.createElement('div');
        boxDiv.className = "absolute border border-dashed border-indigo-500/80 bg-indigo-500/10 hover:bg-indigo-500/35 transition-all cursor-pointer group";
        boxDiv.style.left = leftPct + '%';
        boxDiv.style.top = topPct + '%';
        boxDiv.style.width = widthPct + '%';
        boxDiv.style.height = heightPct + '%';
        const tooltip = document.createElement('span');
        tooltip.className = "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-50 pointer-events-none opacity-90 border border-slate-700 font-sans";
        tooltip.textContent = `${item.text} (${Math.round(item.score * 100)}%)`;
        boxDiv.appendChild(tooltip);
        boxDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(item.text);
            const originalText = tooltip.textContent;
            tooltip.textContent = "已复制该句！";
            setTimeout(() => tooltip.textContent = originalText, 1500);
        });
        ocrOverlayLayer.appendChild(boxDiv);
    });
}

function optimizeTextLayout(items) {
    if (!items || items.length === 0) return [];
    const sortedItems = [...items].sort((a, b) => {
        const yA = Math.min(...a.poly.map(p => p[1]));
        const yB = Math.min(...b.poly.map(p => p[1]));
        return yA - yB;
    });
    const lines = [];
    let currentLine = [sortedItems[0]];
    let currentLineY = Math.min(...sortedItems[0].poly.map(p => p[1]));
    let currentLineHeight = Math.max(...sortedItems[0].poly.map(p => p[1])) - currentLineY;
    for (let i = 1; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        const itemY = Math.min(...item.poly.map(p => p[1]));
        if (itemY - currentLineY < currentLineHeight * 0.5) { currentLine.push(item); }
        else {
            lines.push(currentLine);
            currentLine = [item];
            currentLineY = Math.min(...item.poly.map(p => p[1]));
            currentLineHeight = Math.max(...item.poly.map(p => p[1])) - currentLineY;
        }
    }
    lines.push(currentLine);
    lines.forEach(line => {
        line.sort((a, b) => {
            const xA = Math.min(...a.poly.map(p => p[0]));
            const xB = Math.min(...b.poly.map(p => p[0]));
            return xA - xB;
        });
    });
    return lines;
}

function formatLinesToPreservedLayoutText(lines) {
    if (!lines || lines.length === 0) return '';
    let result = '';
    let lastLineBottomY = null;
    let globalMinX = Infinity;
    lines.forEach(line => { line.forEach(item => { const minX = Math.min(...item.poly.map(p => p[0])); if (minX < globalMinX) globalMinX = minX; }); });
    if (globalMinX === Infinity) globalMinX = 0;
    lines.forEach(line => {
        if (line.length === 0) return;
        const lineMinY = Math.min(...line.map(item => Math.min(...item.poly.map(p => p[1]))));
        const lineMaxY = Math.max(...line.map(item => Math.max(...item.poly.map(p => p[1]))));
        const lineHeight = lineMaxY - lineMinY || 20;
        if (lastLineBottomY !== null) {
            const gap = lineMinY - lastLineBottomY;
            if (gap > lineHeight * 0.6) { const extraLines = Math.min(5, Math.floor(gap / lineHeight)); for (let i = 0; i < extraLines; i++) result += '\n'; }
        }
        lastLineBottomY = lineMaxY;
        let lineText = '';
        let lastItemMaxX = globalMinX;
        let avgCharWidth = 15;
        line.forEach(item => {
            const minX = Math.min(...item.poly.map(p => p[0]));
            const maxX = Math.max(...item.poly.map(p => p[0]));
            if (item.text.length > 0) { avgCharWidth = (maxX - minX) / item.text.length; }
            const gapX = minX - lastItemMaxX;
            if (gapX > avgCharWidth * 0.5) { const spaces = Math.max(1, Math.round(gapX / avgCharWidth)); lineText += '　'.repeat(Math.ceil(spaces / 2)); }
            lineText += item.text;
            lastItemMaxX = maxX;
        });
        result += lineText + '\n';
    });
    return result;
}

function formatLinesToPreservedLayoutParagraphs(lines, Paragraph, TextRun) {
    if (!lines || lines.length === 0) return [];
    const paragraphs = [];
    let lastLineBottomY = null;
    let globalMinX = Infinity;
    lines.forEach(line => { line.forEach(item => { const minX = Math.min(...item.poly.map(p => p[0])); if (minX < globalMinX) globalMinX = minX; }); });
    if (globalMinX === Infinity) globalMinX = 0;
    lines.forEach(line => {
        if (line.length === 0) return;
        const lineMinY = Math.min(...line.map(item => Math.min(...item.poly.map(p => p[1]))));
        const lineMaxY = Math.max(...line.map(item => Math.max(...item.poly.map(p => p[1]))));
        const lineHeight = lineMaxY - lineMinY || 20;
        if (lastLineBottomY !== null) {
            const gap = lineMinY - lastLineBottomY;
            if (gap > lineHeight * 0.6) { const extraLines = Math.min(5, Math.floor(gap / lineHeight)); for (let i = 0; i < extraLines; i++) paragraphs.push(new Paragraph({ text: "" })); }
        }
        lastLineBottomY = lineMaxY;
        let lineText = '';
        let lastItemMaxX = globalMinX;
        let avgCharWidth = 15;
        line.forEach(item => {
            const minX = Math.min(...item.poly.map(p => p[0]));
            const maxX = Math.max(...item.poly.map(p => p[0]));
            if (item.text.length > 0) { avgCharWidth = (maxX - minX) / item.text.length; }
            const gapX = minX - lastItemMaxX;
            if (gapX > avgCharWidth * 0.5) { const spaces = Math.max(1, Math.round(gapX / avgCharWidth)); lineText += '　'.repeat(Math.ceil(spaces / 2)); }
            lineText += item.text;
            lastItemMaxX = maxX;
        });
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: lineText, size: 24 })] }));
    });
    return paragraphs;
}

function updateResultTextarea() {
    let fullText = '';
    if (fileType === 'pdf') {
        for (let p = 1; p <= totalPdfPages; p++) {
            if (recognitionResults[p]) {
                fullText += `--- 第 ${p} 页 ---\n`;
                const lines = optimizeTextLayout(recognitionResults[p]);
                fullText += formatLinesToPreservedLayoutText(lines);
                fullText += '\n';
            }
        }
    } else {
        if (recognitionResults[0]) {
            const lines = optimizeTextLayout(recognitionResults[0]);
            fullText += formatLinesToPreservedLayoutText(lines);
        }
    }
    ocrResultTextarea.value = fullText.trim();
    const hasText = ocrResultTextarea.value.length > 0;
    ocrCopyBtn.disabled = !hasText;
    ocrExportTxtBtn.disabled = !hasText;
    ocrExportWordBtn.disabled = !hasText;
    ocrExportExcelBtn.disabled = !hasText;
}

function switchOcrTab(tabId) {
    if (tabId === 'preview') {
        ocrTabBtnPreview.className = "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 border-b-2 py-2 px-1 text-xs md:text-sm font-semibold focus:outline-none transition-colors";
        ocrTabBtnText.className = "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-b-2 py-2 px-1 text-xs md:text-sm font-medium focus:outline-none transition-colors";
        ocrTabContentPreview.classList.remove('hidden');
        ocrTabContentText.classList.add('hidden');
    } else {
        ocrTabBtnText.className = "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 border-b-2 py-2 px-1 text-xs md:text-sm font-semibold focus:outline-none transition-colors";
        ocrTabBtnPreview.className = "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border-b-2 py-2 px-1 text-xs md:text-sm font-medium focus:outline-none transition-colors";
        ocrTabContentText.classList.remove('hidden');
        ocrTabContentPreview.classList.add('hidden');
    }
}

export function initOcr() {
    ocrInput = document.getElementById('ocrInput');
    ocrFileStatus = document.getElementById('ocrFileStatus');
    ocrEngineIndicator = document.getElementById('ocrEngineIndicator');
    ocrEngineStatusTitle = document.getElementById('ocrEngineStatusTitle');
    ocrEngineStatusDesc = document.getElementById('ocrEngineStatusDesc');
    ocrPdfControls = document.getElementById('ocrPdfControls');
    ocrPdfPrevBtn = document.getElementById('ocrPdfPrevBtn');
    ocrPdfNextBtn = document.getElementById('ocrPdfNextBtn');
    ocrPdfPageNum = document.getElementById('ocrPdfPageNum');
    ocrPdfAllBtn = document.getElementById('ocrPdfAllBtn');
    ocrStartBtn = document.getElementById('ocrStartBtn');
    ocrPlaceholder = document.getElementById('ocrPlaceholder');
    ocrPreviewCanvas = document.getElementById('ocrPreviewCanvas');
    ocrOverlayLayer = document.getElementById('ocrOverlayLayer');
    ocrCanvasContainer = document.getElementById('ocrCanvasContainer');
    ocrTabBtnPreview = document.getElementById('ocrTabBtnPreview');
    ocrTabBtnText = document.getElementById('ocrTabBtnText');
    ocrTabContentPreview = document.getElementById('ocrTabContentPreview');
    ocrTabContentText = document.getElementById('ocrTabContentText');
    ocrResultTextarea = document.getElementById('ocrResultTextarea');
    ocrCopyBtn = document.getElementById('ocrCopyBtn');
    ocrExportTxtBtn = document.getElementById('ocrExportTxtBtn');
    ocrExportWordBtn = document.getElementById('ocrExportWordBtn');
    ocrExportExcelBtn = document.getElementById('ocrExportExcelBtn');

    bindDragAndDropOCR();

    if(ocrInput) {
        ocrInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!validateFile(file, 50, ['image/*', 'application/pdf', '.pdf'])) {
                e.target.value = '';
                return;
            }
            selectedFile = file;
            ocrFileStatus.textContent = `${file.name} (${formatBytes(file.size)})`;
            pdfDoc = null; currentPdfPage = 1; totalPdfPages = 0; recognitionResults = {};
            ocrResultTextarea.value = '';
            ocrCopyBtn.disabled = true; ocrExportTxtBtn.disabled = true;
            ocrExportWordBtn.disabled = true; ocrExportExcelBtn.disabled = true;
            ocrPdfControls.classList.add('hidden');
            ocrPlaceholder.classList.add('hidden');
            ocrPreviewCanvas.classList.add('hidden');
            ocrOverlayLayer.innerHTML = '';
            if (isEngineReady) { ocrStartBtn.disabled = false; }
            if (!isEngineReady && !isEngineLoading) {
                startOcrEngine();
            }
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                fileType = 'pdf';
                await loadPdf(file);
            } else {
                fileType = 'image';
                await loadImage(file);
            }
        });
    }

    if(ocrPdfPrevBtn) {
        ocrPdfPrevBtn.addEventListener('click', async () => {
            if (currentPdfPage > 1) {
                currentPdfPage--;
                ocrPdfPageNum.textContent = `第 ${currentPdfPage} / ${totalPdfPages} 页`;
                await renderPdfPage(currentPdfPage);
            }
        });
    }
    if(ocrPdfNextBtn) {
        ocrPdfNextBtn.addEventListener('click', async () => {
            if (currentPdfPage < totalPdfPages) {
                currentPdfPage++;
                ocrPdfPageNum.textContent = `第 ${currentPdfPage} / ${totalPdfPages} 页`;
                await renderPdfPage(currentPdfPage);
            }
        });
    }

    if(ocrStartBtn) {
        ocrStartBtn.addEventListener('click', async () => {
            if (!isEngineReady || !ocrEngine) return;
            const originalText = ocrStartBtn.textContent;
            ocrStartBtn.disabled = true;
            ocrStartBtn.textContent = '文字识别推理中...';
            try {
                const canvas = ocrPreviewCanvas;
                const [result] = await ocrEngine.predict(canvas);
                const items = result.items || [];
                if (fileType === 'pdf') { recognitionResults[currentPdfPage] = items; }
                else { recognitionResults[0] = items; }
                drawOverlayBoxes(items);
                updateResultTextarea();
                switchOcrTab('text');
                if (window.trackFeatureUse) window.trackFeatureUse('ocr_recognize', 'ok');
                showToast('🎉 文字识别完成！', 'success');
            } catch (err) {
                console.error("OCR prediction error:", err);
                if (window.trackFeatureUse) window.trackFeatureUse('ocr_recognize', 'fail');
                showToast('❌ 文字识别失败: ' + err.message, 'error');
            } finally {
                ocrStartBtn.disabled = false;
                ocrStartBtn.textContent = originalText;
            }
        });
    }

    if(ocrPdfAllBtn) {
        ocrPdfAllBtn.addEventListener('click', async () => {
            if (!isEngineReady || !ocrEngine || !pdfDoc) return;
            if (!confirm(`将依次渲染并识别全部 ${totalPdfPages} 页，这会花费较多时间。是否继续？`)) { return; }
            const originalBtnText = ocrPdfAllBtn.textContent;
            ocrPdfAllBtn.disabled = true; ocrStartBtn.disabled = true;
            try {
                for (let p = 1; p <= totalPdfPages; p++) {
                    ocrPdfAllBtn.textContent = `正在识别: ${p} / ${totalPdfPages} 页`;
                    currentPdfPage = p;
                    ocrPdfPageNum.textContent = `第 ${p} / ${totalPdfPages} 页`;
                    await renderPdfPage(p);
                    const canvas = ocrPreviewCanvas;
                    const [result] = await ocrEngine.predict(canvas);
                    recognitionResults[p] = result.items || [];
                    drawOverlayBoxes(result.items || []);
                }
                updateResultTextarea();
                switchOcrTab('text');
                showToast(`✅ 已完成全部 ${totalPdfPages} 页的文字识别！`, 'success');
            } catch (err) {
                console.error("OCR all pages failed:", err);
                showToast('❌ 批量识别过程中出错: ' + err.message, 'error');
            } finally {
                ocrPdfAllBtn.disabled = false;
                ocrPdfAllBtn.textContent = originalBtnText;
                ocrStartBtn.disabled = false;
            }
        });
    }

    if(ocrTabBtnPreview) ocrTabBtnPreview.addEventListener('click', () => switchOcrTab('preview'));
    if(ocrTabBtnText) ocrTabBtnText.addEventListener('click', () => switchOcrTab('text'));

    if(ocrCopyBtn) {
        ocrCopyBtn.addEventListener('click', () => {
            if (ocrResultTextarea.value) {
                navigator.clipboard.writeText(ocrResultTextarea.value);
                showToast('✅ 已成功复制全部文字到剪贴板！', 'success');
            }
        });
    }

    if(ocrExportTxtBtn) {
        ocrExportTxtBtn.addEventListener('click', () => {
            if (!ocrResultTextarea.value) return;
            const blob = new Blob([ocrResultTextarea.value], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const name = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : 'ocr_result';
            link.download = `${name}_提取文字.txt`;
            link.click();
            URL.revokeObjectURL(url);
        });
    }

    if(ocrExportWordBtn) {
        ocrExportWordBtn.addEventListener('click', () => {
            if (!ocrResultTextarea.value) return;
            if (!window.docx) { showToast('❌ Word 导出库加载失败，请检查网络！', 'error'); return; }
            const { Document, Packer, Paragraph, TextRun } = window.docx;
            const paragraphs = [];
            if (fileType === 'pdf') {
                for (let p = 1; p <= totalPdfPages; p++) {
                    if (recognitionResults[p]) {
                        paragraphs.push(new Paragraph({ children: [new TextRun({ text: `--- 第 ${p} 页 ---`, bold: true, size: 28 })] }));
                        const lines = optimizeTextLayout(recognitionResults[p]);
                        paragraphs.push(...formatLinesToPreservedLayoutParagraphs(lines, Paragraph, TextRun));
                        paragraphs.push(new Paragraph({ text: "" }));
                    }
                }
            } else {
                if (recognitionResults[0]) {
                    const lines = optimizeTextLayout(recognitionResults[0]);
                    paragraphs.push(...formatLinesToPreservedLayoutParagraphs(lines, Paragraph, TextRun));
                }
            }
            const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
            Packer.toBlob(doc).then(blob => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                const name = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : 'ocr_result';
                link.download = `${name}_提取文字.docx`;
                link.click();
                URL.revokeObjectURL(url);
            });
        });
    }

    if(ocrExportExcelBtn) {
        ocrExportExcelBtn.addEventListener('click', () => {
            if (!ocrResultTextarea.value) return;
            if (!window.XLSX) { showToast('❌ Excel 导出库加载失败，请检查网络！', 'error'); return; }
            const wb = window.XLSX.utils.book_new();
            if (fileType === 'pdf') {
                for (let p = 1; p <= totalPdfPages; p++) {
                    if (recognitionResults[p]) {
                        const data = createExcelSheet(recognitionResults[p]);
                        const ws = window.XLSX.utils.aoa_to_sheet(data);
                        window.XLSX.utils.book_append_sheet(wb, ws, `Page ${p}`);
                    }
                }
            } else {
                if (recognitionResults[0]) {
                    const data = createExcelSheet(recognitionResults[0]);
                    const ws = window.XLSX.utils.aoa_to_sheet(data);
                    window.XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
                }
            }
            const name = selectedFile ? selectedFile.name.substring(0, selectedFile.name.lastIndexOf('.')) : 'ocr_result';
            window.XLSX.writeFile(wb, `${name}_提取文字.xlsx`);
        });
    }

    function createExcelSheet(items) {
        if(!items || items.length === 0) return [[]];
        const lines = optimizeTextLayout(items);
        let minXs = []; let totalHeight = 0;
        items.forEach(item => {
            const xCoords = item.poly.map(p => p[0]);
            const yCoords = item.poly.map(p => p[1]);
            minXs.push(Math.min(...xCoords));
            totalHeight += (Math.max(...yCoords) - Math.min(...yCoords));
        });
        const avgHeight = totalHeight / items.length || 20;
        const colThreshold = avgHeight * 1.5;
        minXs.sort((a, b) => a - b);
        let groups = []; let currentGroup = [minXs[0]];
        for (let i = 1; i < minXs.length; i++) {
            if (minXs[i] - currentGroup[0] < colThreshold) { currentGroup.push(minXs[i]); }
            else { groups.push(currentGroup); currentGroup = [minXs[i]]; }
        }
        groups.push(currentGroup);
        let columns = [];
        groups.forEach(g => { const avgX = g.reduce((a,b)=>a+b,0) / g.length; if (g.length >= 2) { columns.push(avgX); } });
        if (columns.length === 0) { columns = groups.map(g => g.reduce((a,b)=>a+b,0)/g.length); }
        columns.sort((a, b) => a - b);
        let data = [];
        lines.forEach(line => {
            let row = new Array(columns.length).fill('');
            line.forEach(item => {
                const minX = Math.min(...item.poly.map(p => p[0]));
                let closestColIdx = 0; let minDiff = Infinity;
                columns.forEach((colX, idx) => { const diff = Math.abs(minX - colX); if (diff < minDiff) { minDiff = diff; closestColIdx = idx; } });
                if (row[closestColIdx]) { row[closestColIdx] += '\n' + item.text; } else { row[closestColIdx] = item.text; }
            });
            data.push(row);
        });
        return data;
    }
}
