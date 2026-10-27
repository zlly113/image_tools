// js/enhancer.js
import { showToast, validateFile, bindDragAndDrop } from './utils.js';

let enhanceInput = null;
let rangeBrightness = null;
let rangeContrast = null;
let rangeSaturation = null;
let rangeSharpen = null;
let valBrightness = null;
let valContrast = null;
let valSaturation = null;
let valSharpen = null;
let enhancePreviewCanvas = null;
let enhanceCtx = null;
let enhancePlaceholder = null;
let enhanceDownloadBtn = null;
let filterPresetBtns = null;

let originalEnhanceImage = null;
let previewEnhanceImage = null;
let enhanceTimeout = null;
let activePresetFilter = '';

const filterMaps = {
    'none': '', 'vintage': 'sepia(0.5) contrast(1.1) brightness(0.9) hue-rotate(-10deg)',
    'grayscale': 'grayscale(1) contrast(1.2)', 'cool': 'hue-rotate(15deg) saturate(0.8) contrast(1.1)',
    'warm': 'sepia(0.3) saturate(1.2) hue-rotate(-5deg)', 'highcontrast': 'contrast(1.5) saturate(1.3)'
};

function applyEnhancements() {
    if (!originalEnhanceImage || !enhanceCtx || !enhancePreviewCanvas) return;
    const activeImage = previewEnhanceImage || originalEnhanceImage;
    const w = activeImage.width; const h = activeImage.height;
    enhancePreviewCanvas.width = w; enhancePreviewCanvas.height = h;
    const br = rangeBrightness ? rangeBrightness.value : 100;
    const ct = rangeContrast ? rangeContrast.value : 100;
    const sa = rangeSaturation ? rangeSaturation.value : 100;
    let combinedFilter = `brightness(${br}%) contrast(${ct}%) saturate(${sa}%)`;
    if (activePresetFilter) { combinedFilter += ` ${activePresetFilter}`; }
    enhanceCtx.filter = combinedFilter;
    enhanceCtx.clearRect(0, 0, w, h);
    enhanceCtx.drawImage(activeImage, 0, 0);
    enhanceCtx.filter = 'none';
    const sharpenIntensity = rangeSharpen ? parseInt(rangeSharpen.value) : 0;
    if (sharpenIntensity > 0) {
        const imageData = enhanceCtx.getImageData(0, 0, w, h);
        const data = imageData.data;
        const dstData = new Uint8ClampedArray(data.length);
        const mix = sharpenIntensity / 100;
        const center = 4 * mix + 1; const edge = -mix;
        const weights = [0, edge, 0, edge, center, edge, 0, edge, 0];
        const side = 3; const halfSide = 1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const dstOff = (y * w + x) * 4;
                let r = 0, g = 0, b = 0;
                for (let cy = 0; cy < side; cy++) {
                    for (let cx = 0; cx < side; cx++) {
                        const scy = y + cy - halfSide; const scx = x + cx - halfSide;
                        let srcOff = (scy >= 0 && scy < h && scx >= 0 && scx < w) ? (scy * w + scx) * 4 : dstOff;
                        const wt = weights[cy * side + cx];
                        r += data[srcOff] * wt; g += data[srcOff + 1] * wt; b += data[srcOff + 2] * wt;
                    }
                }
                dstData[dstOff] = r; dstData[dstOff + 1] = g; dstData[dstOff + 2] = b; dstData[dstOff + 3] = data[dstOff + 3];
            }
        }
        const newImageData = new ImageData(dstData, w, h);
        enhanceCtx.putImageData(newImageData, 0, 0);
    }
}

export function initEnhancer() {
    enhanceInput = document.getElementById('enhanceInput');
    rangeBrightness = document.getElementById('rangeBrightness');
    rangeContrast = document.getElementById('rangeContrast');
    rangeSaturation = document.getElementById('rangeSaturation');
    rangeSharpen = document.getElementById('rangeSharpen');
    valBrightness = document.getElementById('valBrightness');
    valContrast = document.getElementById('valContrast');
    valSaturation = document.getElementById('valSaturation');
    valSharpen = document.getElementById('valSharpen');
    enhancePreviewCanvas = document.getElementById('enhancePreviewCanvas');
    enhanceCtx = enhancePreviewCanvas ? enhancePreviewCanvas.getContext('2d', { willReadFrequently: true }) : null;
    enhancePlaceholder = document.getElementById('enhancePlaceholder');
    enhanceDownloadBtn = document.getElementById('enhanceDownloadBtn');
    filterPresetBtns = document.querySelectorAll('.filter-preset');

    bindDragAndDrop('enhanceDropZone', 'enhanceInput');

    filterPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterPresetBtns.forEach(b => b.classList.remove('active', 'ring-2', 'ring-indigo-500'));
            btn.classList.add('active', 'ring-2', 'ring-indigo-500');
            activePresetFilter = filterMaps[btn.dataset.filter];
            applyEnhancements();
        });
    });

    if (enhanceInput) {
        enhanceInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (!validateFile(file, 30, ['image/*'])) { e.target.value = ''; return; }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    originalEnhanceImage = img;
                    const maxDim = 1000;
                    if (img.width > maxDim || img.height > maxDim) {
                        const scale = Math.min(maxDim / img.width, maxDim / img.height);
                        const pCanvas = document.createElement('canvas');
                        pCanvas.width = Math.round(img.width * scale);
                        pCanvas.height = Math.round(img.height * scale);
                        const pCtx = pCanvas.getContext('2d');
                        pCtx.drawImage(img, 0, 0, pCanvas.width, pCanvas.height);
                        previewEnhanceImage = pCanvas;
                    } else { previewEnhanceImage = null; }
                    const activeImage = previewEnhanceImage || originalEnhanceImage;
                    if(enhancePreviewCanvas) { enhancePreviewCanvas.width = activeImage.width; enhancePreviewCanvas.height = activeImage.height; enhancePreviewCanvas.classList.remove('hidden'); }
                    if(enhancePlaceholder) enhancePlaceholder.classList.add('hidden');
                    if(enhanceDownloadBtn) enhanceDownloadBtn.disabled = false;
                    applyEnhancements();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    [rangeBrightness, rangeContrast, rangeSaturation, rangeSharpen].forEach(slider => {
        if(slider) {
            slider.addEventListener('input', (e) => {
                if(e.target === rangeBrightness && valBrightness) valBrightness.textContent = e.target.value + '%';
                if(e.target === rangeContrast && valContrast) valContrast.textContent = e.target.value + '%';
                if(e.target === rangeSaturation && valSaturation) valSaturation.textContent = e.target.value + '%';
                if(e.target === rangeSharpen && valSharpen) valSharpen.textContent = e.target.value;
                clearTimeout(enhanceTimeout);
                enhanceTimeout = setTimeout(applyEnhancements, 50);
            });
        }
    });

    if (enhanceDownloadBtn) {
        enhanceDownloadBtn.addEventListener('click', () => {
            if (!originalEnhanceImage) return;
            const originalText = enhanceDownloadBtn.textContent;
            enhanceDownloadBtn.textContent = '正在生成超清大图，请稍候...';
            enhanceDownloadBtn.disabled = true;
            setTimeout(() => {
                try {
                    const fullCanvas = document.createElement('canvas');
                    fullCanvas.width = originalEnhanceImage.width;
                    fullCanvas.height = originalEnhanceImage.height;
                    const fullCtx = fullCanvas.getContext('2d');
                    const br = rangeBrightness ? rangeBrightness.value : 100;
                    const ct = rangeContrast ? rangeContrast.value : 100;
                    const sa = rangeSaturation ? rangeSaturation.value : 100;
                    let combinedFilter = `brightness(${br}%) contrast(${ct}%) saturate(${sa}%)`;
                    if (activePresetFilter) combinedFilter += ` ${activePresetFilter}`;
                    fullCtx.filter = combinedFilter;
                    fullCtx.drawImage(originalEnhanceImage, 0, 0);
                    fullCtx.filter = 'none';
                    const sharpenIntensity = rangeSharpen ? parseInt(rangeSharpen.value) : 0;
                    if (sharpenIntensity > 0) {
                        const w = fullCanvas.width; const h = fullCanvas.height;
                        const imageData = fullCtx.getImageData(0, 0, w, h);
                        const data = imageData.data;
                        const dstData = new Uint8ClampedArray(data.length);
                        const mix = sharpenIntensity / 100;
                        const center = 4 * mix + 1; const edge = -mix;
                        const weights = [0, edge, 0, edge, center, edge, 0, edge, 0];
                        const side = 3; const halfSide = 1;
                        for (let y = 0; y < h; y++) {
                            for (let x = 0; x < w; x++) {
                                const dstOff = (y * w + x) * 4;
                                let r = 0, g = 0, b = 0;
                                for (let cy = 0; cy < side; cy++) {
                                    for (let cx = 0; cx < side; cx++) {
                                        const scy = y + cy - halfSide; const scx = x + cx - halfSide;
                                        let srcOff = (scy >= 0 && scy < h && scx >= 0 && scx < w) ? (scy * w + scx) * 4 : dstOff;
                                        const wt = weights[cy * side + cx];
                                        r += data[srcOff] * wt; g += data[srcOff + 1] * wt; b += data[srcOff + 2] * wt;
                                    }
                                }
                                dstData[dstOff] = r; dstData[dstOff + 1] = g; dstData[dstOff + 2] = b; dstData[dstOff + 3] = data[dstOff + 3];
                            }
                        }
                        const newImageData = new ImageData(dstData, w, h);
                        fullCtx.putImageData(newImageData, 0, 0);
                    }
                    const link = document.createElement('a');
                    link.href = fullCanvas.toDataURL('image/jpeg', 0.98);
                    link.download = `修复滤镜出图_${Date.now()}.jpg`;
                    link.click();
                    if (window.trackFeatureUse) window.trackFeatureUse('enhancer_export', 'ok');
                    showToast('🎉 超清大图已保存！', 'success');
                } catch (err) {
                    console.error('全尺寸滤镜生成出错:', err);
                    if (window.trackFeatureUse) window.trackFeatureUse('enhancer_export', 'fail');
                    showToast('❌ 保存失败，请重试', 'error');
                } finally {
                    enhanceDownloadBtn.textContent = originalText;
                    enhanceDownloadBtn.disabled = false;
                }
            }, 50);
        });
    }
}
