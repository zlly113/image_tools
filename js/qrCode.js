// js/qrCode.js
import { showToast, copyTextToClipboard } from './utils.js';

export let qrCodeInstance = null;
export function getQrCodeInstance() {
    return qrCodeInstance;
}
export function setQrCodeInstance(val) {
    qrCodeInstance = val;
}
let qrLogoDataUrl = null;
let isUserErrorLevelCustomized = false;
let qrDebounceTimeout = null;
const htmlEl = document.documentElement;

const qrPresets = {
    minimal: {
        dotsOptions: { color: "#000000", type: "square" },
        backgroundOptions: { color: "#ffffff" },
        cornersSquareOptions: { color: "#000000", type: "square" },
        cornersDotOptions: { color: "#000000", type: "square" }
    },
    neon: {
        dotsOptions: { color: "#06b6d4", type: "extra-rounded" },
        backgroundOptions: { color: "#0f172a" },
        cornersSquareOptions: { color: "#06b6d4", type: "rounded" },
        cornersDotOptions: { color: "#22d3ee", type: "dot" }
    },
    business: {
        dotsOptions: { color: "#1e293b", type: "rounded" },
        backgroundOptions: { color: "#ffffff" },
        cornersSquareOptions: { color: "#0f172a", type: "rounded" },
        cornersDotOptions: { color: "#1e293b", type: "rounded" }
    },
    fresh: {
        dotsOptions: { color: "#10b981", type: "dots" },
        backgroundOptions: { color: "#ffffff" },
        cornersSquareOptions: { color: "#10b981", type: "dot" },
        cornersDotOptions: { color: "#059669", type: "dot" }
    }
};

export function switchLinkToolTab(tabId) {
    switchQRSubTab('generate');
}

export function switchQRSubTab(tabId) {
    const genBtn = document.getElementById('btn-qr-generate');
    const decBtn = document.getElementById('btn-qr-decode');
    const genPanel = document.getElementById('panel-qr-generate');
    const decPanel = document.getElementById('panel-qr-decode');

    if (!genBtn || !decBtn || !genPanel || !decPanel) return;

    const activeClass = "px-3.5 py-1.5 text-xs md:text-sm font-semibold rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs transition-colors flex items-center gap-1.5";
    const inactiveClass = "px-3.5 py-1.5 text-xs md:text-sm font-medium rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors flex items-center gap-1.5";

    if (tabId === 'generate') {
        genBtn.className = activeClass;
        decBtn.className = inactiveClass;
        genPanel.classList.remove('hidden');
        decPanel.classList.add('hidden');
        setTimeout(() => regenerateQRCode(), 50);
    } else {
        genBtn.className = inactiveClass;
        decBtn.className = activeClass;
        genPanel.classList.add('hidden');
        decPanel.classList.remove('hidden');
    }
}

function initQRCode() {
    const mountPoint = document.getElementById('qr-canvas-mount');
    if (!mountPoint) return;

    if (typeof window.QRCodeStyling !== 'function') {
        console.error('QRCodeStyling 库未加载');
        showToast('❌ 二维码组件加载失败，请刷新页面重试', 'error');
        return;
    }

    try {
        mountPoint.innerHTML = '';
        const isDark = htmlEl.classList.contains('dark');
        const initialFore = isDark ? '#ffffff' : '#000000';
        const initialBg = isDark ? '#0f172a' : '#ffffff';

        const foreColorInput = document.getElementById('qr-color-fore');
        const bgColorInput = document.getElementById('qr-color-bg');
        if (foreColorInput) foreColorInput.value = initialFore;
        if (bgColorInput) bgColorInput.value = initialBg;

        qrCodeInstance = new window.QRCodeStyling({
            width: 230,
            height: 230,
            data: "https://www.hhdzai.top",
            dotsOptions: { color: initialFore, type: "square" },
            backgroundOptions: { color: initialBg },
            cornersSquareOptions: { color: initialFore, type: "square" },
            cornersDotOptions: { color: initialFore, type: "square" },
            qrOptions: { errorCorrectionLevel: "Q" }
        });

        qrCodeInstance.append(mountPoint);

        const input = document.getElementById('qr-input-text');
        if (input) {
            input.addEventListener('input', () => {
                if (qrDebounceTimeout) clearTimeout(qrDebounceTimeout);
                qrDebounceTimeout = setTimeout(() => regenerateQRCode(), 200);
            });
        }

        regenerateQRCode();
    } catch (err) {
        console.error('initQRCode 失败:', err);
        showToast('❌ 二维码初始化失败：' + err.message, 'error');
    }
}

function toggleQRTransparentBg() {
    const bgChk = document.getElementById('qr-bg-transparent');
    const bgCol = document.getElementById('qr-color-bg');
    if (!bgChk || !bgCol) return;
    if (bgChk.checked) {
        bgCol.disabled = true;
        bgCol.style.opacity = '0.5';
    } else {
        bgCol.disabled = false;
        bgCol.style.opacity = '1';
    }
    regenerateQRCode();
}

function handleQRLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        qrLogoDataUrl = evt.target.result;
        
        const logoSettings = document.getElementById('qr-logo-settings');
        const clearLogoBtn = document.getElementById('btn-qr-clear-logo');
        if (logoSettings) logoSettings.classList.remove('hidden');
        if (clearLogoBtn) clearLogoBtn.classList.remove('hidden');

        const ecSelect = document.getElementById('qr-error-level');
        const errorTip = document.getElementById('qr-logo-error-tip');
        if (ecSelect && errorTip) {
            if (!isUserErrorLevelCustomized) {
                ecSelect.value = "H";
                errorTip.classList.remove('hidden');
            } else {
                errorTip.classList.add('hidden');
            }
        }

        regenerateQRCode();
    };
    reader.readAsDataURL(file);
}

function clearQRLogo() {
    qrLogoDataUrl = null;
    const logoFile = document.getElementById('qr-logo-file');
    const logoSettings = document.getElementById('qr-logo-settings');
    const clearLogoBtn = document.getElementById('btn-qr-clear-logo');
    const errorTip = document.getElementById('qr-logo-error-tip');
    
    if (logoFile) logoFile.value = '';
    if (logoSettings) logoSettings.classList.add('hidden');
    if (clearLogoBtn) clearLogoBtn.classList.add('hidden');
    if (errorTip) errorTip.classList.add('hidden');
    
    const ecSelect = document.getElementById('qr-error-level');
    if (ecSelect && !isUserErrorLevelCustomized) {
        ecSelect.value = "AUTO";
    }
    regenerateQRCode();
}

function adjustQRLogoSize(val) {
    const sizeLabel = document.getElementById('qr-logo-size-label');
    if (sizeLabel) sizeLabel.textContent = Math.round(val * 100) + '%';
    regenerateQRCode();
}

function handleQRErrorLevelChange() {
    isUserErrorLevelCustomized = true;
    const errorTip = document.getElementById('qr-logo-error-tip');
    if (errorTip) errorTip.classList.add('hidden');
    regenerateQRCode();
}

function applyQRPreset(preset) {
    const config = qrPresets[preset];
    if (!config) return;

    const foreColorInput = document.getElementById('qr-color-fore');
    const bgColorInput = document.getElementById('qr-color-bg');
    const bgTransparentInput = document.getElementById('qr-bg-transparent');
    const styleDotsInput = document.getElementById('qr-style-dots');
    const styleCornersInput = document.getElementById('qr-style-corners');

    if (foreColorInput) foreColorInput.value = config.dotsOptions.color;
    if (bgColorInput) {
        bgColorInput.value = config.backgroundOptions.color;
        bgColorInput.disabled = false;
        bgColorInput.style.opacity = '1';
    }
    if (bgTransparentInput) bgTransparentInput.checked = false;
    
    if (styleDotsInput) styleDotsInput.value = config.dotsOptions.type;
    if (styleCornersInput) styleCornersInput.value = config.cornersSquareOptions.type;

    if (preset === 'business' && !qrLogoDataUrl) {
        showToast('已切换至商务经典，您可以上传 Logo 进行美化');
    }

    regenerateQRCode();
}

function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function getLuminance(r, g, b) {
    const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function regenerateQRCode() {
    if (!qrCodeInstance) return;

    const inputTextEl = document.getElementById('qr-input-text');
    const foreColorEl = document.getElementById('qr-color-fore');
    const bgTransparentEl = document.getElementById('qr-bg-transparent');
    const bgColorEl = document.getElementById('qr-color-bg');
    const dotStyleEl = document.getElementById('qr-style-dots');
    const cornerStyleEl = document.getElementById('qr-style-corners');
    const logoMarginEl = document.getElementById('qr-logo-margin');
    const logoSizeEl = document.getElementById('qr-logo-size');
    const errorLevelEl = document.getElementById('qr-error-level');

    if (!inputTextEl || !foreColorEl || !bgTransparentEl || !bgColorEl || !dotStyleEl || !cornerStyleEl || !logoMarginEl || !logoSizeEl || !errorLevelEl) return;

    const inputText = inputTextEl.value.trim();
    const foreColor = foreColorEl.value;
    const isTransparent = bgTransparentEl.checked;
    const bgColor = isTransparent ? 'transparent' : bgColorEl.value;
    const dotStyle = dotStyleEl.value;
    const cornerStyle = cornerStyleEl.value;
    const logoMargin = logoMarginEl.checked;
    const logoSize = parseFloat(logoSizeEl.value);
    let errorLevel = errorLevelEl.value;

    const hasText = inputText.length > 0;
    
    const btnCopy = document.getElementById('btn-qr-copy');
    const btnPng = document.getElementById('btn-qr-png');
    const btnSvg = document.getElementById('btn-qr-svg');
    const btnPrint = document.getElementById('btn-qr-print');
    
    if (btnCopy) btnCopy.disabled = !hasText;
    if (btnPng) btnPng.disabled = !hasText;
    if (btnSvg) btnSvg.disabled = !hasText;
    if (btnPrint) btnPrint.disabled = !hasText;

    const placeholder = document.getElementById('qr-empty-placeholder');
    const mount = document.getElementById('qr-canvas-mount');
    const overlay = document.getElementById('qr-img-overlay');

    if (!hasText) {
        if (placeholder) placeholder.classList.remove('hidden');
        if (mount) mount.classList.add('opacity-0');
        if (overlay) overlay.classList.add('hidden');
        return;
    } else {
        if (placeholder) placeholder.classList.add('hidden');
        if (mount) mount.classList.remove('opacity-0');
    }

    const contrastWarning = document.getElementById('qr-contrast-warning');
    if (contrastWarning) {
        const foreRgb = hexToRgb(foreColor);
        const foreLum = getLuminance(foreRgb.r, foreRgb.g, foreRgb.b);
        if (isTransparent) {
            // 透明背景下，如果码点颜色偏亮 (如深色模式默认白色码点)，在白色纸张/背景上几乎不可见
            if (foreLum > 0.6) {
                contrastWarning.textContent = '⚠️ 当前背景为透明且码点为浅色，打印或置于白底展示时可能无法被扫描识别，建议使用深色码点。';
                contrastWarning.classList.remove('hidden');
            } else {
                contrastWarning.classList.add('hidden');
            }
        } else {
            const bgRgb = hexToRgb(bgColor);
            const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
            if (foreLum > bgLum || Math.abs(foreLum - bgLum) < 0.25) {
                contrastWarning.textContent = '⚠️ 码点与背景颜色对比度过低，手机可能难以识别，建议增大明暗对比。';
                contrastWarning.classList.remove('hidden');
            } else {
                contrastWarning.classList.add('hidden');
            }
        }
    }

    const options = {
        data: inputText,
        dotsOptions: {
            color: foreColor,
            type: dotStyle
        },
        backgroundOptions: {
            color: bgColor
        },
        cornersSquareOptions: {
            color: foreColor,
            type: cornerStyle
        },
        cornersDotOptions: {
            color: foreColor,
            type: cornerStyle === 'square' ? 'square' : 'dot'
        },
        qrOptions: {
            errorCorrectionLevel: errorLevel === 'AUTO' ? (qrLogoDataUrl ? 'H' : 'Q') : errorLevel
        }
    };

    if (qrLogoDataUrl) {
        options.image = qrLogoDataUrl;
        options.imageOptions = {
            hideBackgroundDots: logoMargin,
            imageSize: logoSize,
            margin: logoMargin ? 4 : 0
        };
    } else {
        options.image = null;
    }

    try {
        qrCodeInstance.update(options);
    } catch (err) {
        console.error("二维码生成失败 (可能内容超出容量限制):", err);
        if (overlay) {
            overlay.classList.add('hidden');
            if (overlay.src && overlay.src.startsWith('blob:')) {
                URL.revokeObjectURL(overlay.src);
                overlay.src = '';
            }
        }
        if (mount) mount.classList.add('opacity-0');
        if (btnCopy) btnCopy.disabled = true;
        if (btnPng) btnPng.disabled = true;
        if (btnSvg) btnSvg.disabled = true;
        if (btnPrint) btnPrint.disabled = true;

        showToast('❌ 二维码内容过长，已超出编码容量上限，请精简文本或调低容错率', 'error');
        return;
    }

    setTimeout(() => {
        if (!overlay) return;
        qrCodeInstance.getRawData('png').then(blob => {
            if (!blob) throw new Error('二维码图片数据为空');
            const oldUrl = overlay.src;
            if (oldUrl && oldUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldUrl);
            }
            overlay.src = URL.createObjectURL(blob);
            overlay.classList.remove('hidden');
        }).catch(err => {
            console.error("生成镜像图片失败", err);
            overlay.classList.add('hidden');
            showToast('二维码预览渲染失败，请重试或检查内容长度');
        });
    }, 150);
}

async function copyQrToClipboard() {
    try {
        if (navigator.clipboard && window.ClipboardItem) {
            const blob = await qrCodeInstance.getRawData('png');
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('✅ 二维码图片已成功复制到剪贴板！');
        } else {
            qrCodeInstance.download({ name: 'qrcode', extension: 'png' });
            showToast('⚠️ 浏览器限制，已降级为直接下载 PNG 格式');
        }
    } catch (err) {
        console.error('复制失败，改为直接下载:', err);
        qrCodeInstance.download({ name: 'qrcode', extension: 'png' });
        showToast('⚠️ 复制失败，已改为下载 PNG 文件');
    }
}

function downloadQRCode(format) {
    const sizeSelectEl = document.getElementById('qr-size');
    if (!sizeSelectEl) return;
    const sizeSelect = sizeSelectEl.value;
    const originalWidth = qrCodeInstance._options.width;
    const originalHeight = qrCodeInstance._options.height;

    qrCodeInstance.update({
        width: parseInt(sizeSelect),
        height: parseInt(sizeSelect)
    });

    qrCodeInstance.download({
        name: 'qrcode_' + sizeSelect + 'px',
        extension: format
    });

    if (window.trackFeatureUse) window.trackFeatureUse('qr_generate', 'ok');

    setTimeout(() => {
        qrCodeInstance.update({
            width: originalWidth,
            height: originalHeight
        });
    }, 300);
}

function printQRCode() {
    const imgOverlay = document.getElementById('qr-img-overlay');
    if (!imgOverlay || !imgOverlay.src) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>打印二维码 - 超级工具箱 Pro</title>
            <style>
                body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
                img { max-width: 80%; height: auto; border: 1px solid #eee; padding: 10px; border-radius: 8px; }
                p { color: #666; font-size: 14px; margin-top: 15px; }
                @media print {
                    p { display: none; }
                    body { background: transparent; }
                }
            </style>
        </head>
        <body>
            <img src="${imgOverlay.src}" />
            <p>提示：快捷键 Ctrl + P 打印，或右键选择打印</p>
            <script>
                window.onload = function() { window.print(); }
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function handleQRDragOver(e) {
    e.preventDefault();
    const dropzone = document.getElementById('qr-dropzone');
    if (dropzone) dropzone.classList.add('drag-active');
}

function handleQRDragLeave(e) {
    e.preventDefault();
    const dropzone = document.getElementById('qr-dropzone');
    if (dropzone) dropzone.classList.remove('drag-active');
}

function handleQRDrop(e) {
    e.preventDefault();
    const dropzone = document.getElementById('qr-dropzone');
    if (dropzone) dropzone.classList.remove('drag-active');
    const file = e.dataTransfer.files[0];
    if (file) {
        decodeQRCode(file);
    }
}

function handleQRDecodeFile(e) {
    const file = e.target.files[0];
    if (file) {
        decodeQRCode(file);
    }
}

async function decodeQRCode(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('❌ 请选择有效的图片文件');
        return;
    }

    const successBox = document.getElementById('qr-decode-success');
    const emptyBox = document.getElementById('qr-decode-empty');
    const errorBox = document.getElementById('qr-decode-error');
    const resultText = document.getElementById('qr-decode-result-text');
    const openBtn = document.getElementById('btn-qr-decode-open');

    const reader = new FileReader();
    reader.onload = function(evt) {
        const img = new Image();
        img.onload = async function() {
            try {
                if ('BarcodeDetector' in window) {
                    try {
                        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
                        const barcodes = await barcodeDetector.detect(img);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            renderQRResult(barcodes[0].rawValue);
                            return;
                        }
                    } catch (errNative) {}
                }

                const jsQRFunc = (typeof window.jsQR === 'function') 
                    ? window.jsQR 
                    : (window.jsQR && window.jsQR.default) 
                        ? window.jsQR.default 
                        : null;

                if (!jsQRFunc) {
                    showToast('❌ 二维码解码组件未就绪');
                    return;
                }

                let decodedData = scanImageMultiPass(img, jsQRFunc);

                if (decodedData) {
                    renderQRResult(decodedData);
                } else {
                    if (successBox) successBox.classList.add('hidden');
                    if (emptyBox) emptyBox.classList.add('hidden');
                    if (errorBox) errorBox.classList.remove('hidden');
                    showToast('⚠️ 未检测到有效二维码，请上传清晰图像');
                }

            } catch (err) {
                console.error('QR Decode error:', err);
                showToast('❌ 二维码解析异常，请稍后重试', 'error');
            }
        };
        img.onerror = () => {
            showToast('❌ 图片载入失败，请检查文件是否损坏', 'error');
        };
        img.src = evt.target.result;
    };
    reader.onerror = () => {
        showToast('❌ 读取图片文件失败', 'error');
    };
    reader.readAsDataURL(file);

    function renderQRResult(textData) {
        if (resultText) resultText.textContent = textData;
        if (successBox) successBox.classList.remove('hidden');
        if (emptyBox) emptyBox.classList.add('hidden');
        if (errorBox) errorBox.classList.add('hidden');

        if (openBtn) {
            if (textData.startsWith('http://') || textData.startsWith('https://')) {
                openBtn.href = textData;
                openBtn.classList.remove('hidden');
            } else {
                openBtn.classList.add('hidden');
            }
        }
        showToast('🎉 二维码解析成功！', 'success');
    }
}

function scanImageMultiPass(img, jsQRFunc) {
    // 限制最大解码画布尺寸，避免巨幅照片 (如 48MP 8000x6000) 导致高分辨率 Canvas 内存爆炸 (OOM)
    const sizes = [1200, 800, 500];
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    for (let maxDim of sizes) {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
            if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
            } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
            }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Pass 1: 原图直接识别
        let originalData = ctx.getImageData(0, 0, width, height);
        let result = jsQRFunc(originalData.data, width, height, { inversionAttempts: "attemptBoth" });
        if (result && result.data) return result.data;

        // Pass 2: 暗色通道二值化 (针对对比度较弱的暗码)
        let minData = ctx.createImageData(width, height);
        let srcPixels = originalData.data;
        let minPixels = minData.data;
        for (let i = 0; i < srcPixels.length; i += 4) {
            let minVal = Math.min(srcPixels[i], srcPixels[i+1], srcPixels[i+2]);
            let bw = minVal < 160 ? 0 : 255;
            minPixels[i] = bw;
            minPixels[i+1] = bw;
            minPixels[i+2] = bw;
            minPixels[i+3] = 255;
        }
        result = jsQRFunc(minPixels, width, height, { inversionAttempts: "attemptBoth" });
        if (result && result.data) return result.data;

        // Pass 3: 亮色通道二值化 (从原始原图像素计算，避免叠加失真)
        let maxData = ctx.createImageData(width, height);
        let maxPixels = maxData.data;
        for (let i = 0; i < srcPixels.length; i += 4) {
            let maxVal = Math.max(srcPixels[i], srcPixels[i+1], srcPixels[i+2]);
            let bw = maxVal > 100 ? 255 : 0;
            maxPixels[i] = bw;
            maxPixels[i+1] = bw;
            maxPixels[i+2] = bw;
            maxPixels[i+3] = 255;
        }
        result = jsQRFunc(maxPixels, width, height, { inversionAttempts: "attemptBoth" });
        if (result && result.data) return result.data;
    }

    return null;
}

function copyQRDecodedText() {
    const textEl = document.getElementById('qr-decode-result-text');
    if (!textEl) return;
    const text = textEl.value;
    if (!text) return;
    copyTextToClipboard(text, '解析内容已复制');
}

function handleThemeChangeForQR() {
    if (!qrCodeInstance) return;
    const isDark = htmlEl.classList.contains('dark');
    const foreInput = document.getElementById('qr-color-fore');
    const bgInput = document.getElementById('qr-color-bg');
    
    if (!foreInput || !bgInput) return;
    const currentFore = foreInput.value.toLowerCase();
    const currentBg = bgInput.value.toLowerCase();
    
    if (isDark) {
        if (currentFore === '#000000' && currentBg === '#ffffff') {
            foreInput.value = '#ffffff';
            bgInput.value = '#0f172a';
            regenerateQRCode();
        }
    } else {
        if (currentFore === '#ffffff' && currentBg === '#0f172a') {
            foreInput.value = '#000000';
            bgInput.value = '#ffffff';
            regenerateQRCode();
        }
    }
}

export function initQrCode() {
    // Bind global functions to window
    window.switchLinkToolTab = switchLinkToolTab;
    window.switchQRSubTab = switchQRSubTab;
    window.toggleQRTransparentBg = toggleQRTransparentBg;
    
    window.handleQRLogoUpload = handleQRLogoUpload;
    window.clearQRLogo = clearQRLogo;
    window.adjustQRLogoSize = adjustQRLogoSize;
    window.handleQRErrorLevelChange = handleQRErrorLevelChange;
    window.applyQRPreset = applyQRPreset;
    window.regenerateQRCode = regenerateQRCode;
    window.copyQrToClipboard = copyQrToClipboard;
    window.downloadQRCode = downloadQRCode;
    window.printQRCode = printQRCode;
    
    window.handleQRDragOver = handleQRDragOver;
    window.handleQRDragLeave = handleQRDragLeave;
    window.handleQRDrop = handleQRDrop;
    window.handleQRDecodeFile = handleQRDecodeFile;
    window.copyQRDecodedText = copyQRDecodedText;

    const qrLogoSizeInput = document.getElementById('qr-logo-size');
    if (qrLogoSizeInput) {
        qrLogoSizeInput.addEventListener('input', (e) => adjustQRLogoSize(e.target.value));
    }

    const qrErrorLevelSelect = document.getElementById('qr-error-level');
    if (qrErrorLevelSelect) {
        qrErrorLevelSelect.addEventListener('change', handleQRErrorLevelChange);
    }

    // 注意：qr-logo-file, btn-qr-clear-logo, qr-dropzone, qr-decode-file 已在 index.html 声明内联事件，
    // 此处无需重复 addEventListener，避免同一交互触发双次执行。

    const qrPresetsContainer = document.querySelectorAll('.qr-preset-option');
    qrPresetsContainer.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.getAttribute('data-preset');
            applyQRPreset(preset);
            // Toggle active styles on preset buttons
            qrPresetsContainer.forEach(b => b.classList.remove('border-indigo-600', 'dark:border-indigo-400'));
            btn.classList.add('border-indigo-600', 'dark:border-indigo-400');
        });
    });

    const qrColorFore = document.getElementById('qr-color-fore');
    if (qrColorFore) qrColorFore.addEventListener('change', regenerateQRCode);
    const qrColorBg = document.getElementById('qr-color-bg');
    if (qrColorBg) qrColorBg.addEventListener('change', regenerateQRCode);
    const qrBgTransparent = document.getElementById('qr-bg-transparent');
    if (qrBgTransparent) qrBgTransparent.addEventListener('change', toggleQRTransparentBg);
    const qrStyleDots = document.getElementById('qr-style-dots');
    if (qrStyleDots) qrStyleDots.addEventListener('change', regenerateQRCode);
    const qrStyleCorners = document.getElementById('qr-style-corners');
    if (qrStyleCorners) qrStyleCorners.addEventListener('change', regenerateQRCode);
    const qrLogoMargin = document.getElementById('qr-logo-margin');
    if (qrLogoMargin) qrLogoMargin.addEventListener('change', regenerateQRCode);

    ['sidebarThemeToggleBtn', 'mobileThemeToggleBtn'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                setTimeout(handleThemeChangeForQR, 50);
            });
        }
    });

    // Initialize QR Code canvas
    initQRCode();
}
