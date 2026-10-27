// js/converter.js
import { showToast, validateFile } from './utils.js';

let convertInput = null;
let convertQueueStatus = null;
let convertWidth = null;
let convertHeight = null;
let lockRatio = null;
let formatSelect = null;
let qualityControl = null;
let qualityRange = null;
let qualityValue = null;
let convertPreviewImg = null;
let convertCanvas = null;
let convertCtx = null;
let convertPlaceholder = null;
let convertDownloadBtn = null;

let convertFilesQueue = [];
let originalConvertImageFirst = null;
let originalRatio = 1;

function updateConvertCanvas() {
    if (!originalConvertImageFirst || !convertCtx || !convertCanvas) return;
    const targetW = parseInt(convertWidth ? convertWidth.value : 0) || 1;
    const targetH = parseInt(convertHeight ? convertHeight.value : 0) || 1;
    convertCanvas.width = targetW; convertCanvas.height = targetH;
    if (formatSelect && formatSelect.value === 'image/jpeg') { convertCtx.fillStyle = '#FFFFFF'; convertCtx.fillRect(0, 0, targetW, targetH); }
    else { convertCtx.clearRect(0, 0, targetW, targetH); }
    convertCtx.drawImage(originalConvertImageFirst, 0, 0, targetW, targetH);
    if (convertPreviewImg) {
        const format = formatSelect ? formatSelect.value : 'image/jpeg';
        const quality = qualityRange ? parseInt(qualityRange.value) / 100 : 0.9;
        convertPreviewImg.src = convertCanvas.toDataURL(format, quality);
        convertPreviewImg.classList.remove('hidden');
    }
}

function dataURLtoBlob(dataurl) {
    var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){ u8arr[n] = bstr.charCodeAt(n); }
    return new Blob([u8arr], {type:mime});
}

export function initConverter() {
    convertInput = document.getElementById('convertInput');
    convertQueueStatus = document.getElementById('convertQueueStatus');
    convertWidth = document.getElementById('convertWidth');
    convertHeight = document.getElementById('convertHeight');
    lockRatio = document.getElementById('lockRatio');
    formatSelect = document.getElementById('formatSelect');
    qualityControl = document.getElementById('qualityControl');
    qualityRange = document.getElementById('qualityRange');
    qualityValue = document.getElementById('qualityValue');
    convertPreviewImg = document.getElementById('convertPreviewImg');
    convertCanvas = document.getElementById('convertCanvas');
    convertCtx = convertCanvas ? convertCanvas.getContext('2d') : null;
    convertPlaceholder = document.getElementById('convertPlaceholder');
    convertDownloadBtn = document.getElementById('convertDownloadBtn');

    if(convertInput) {
        convertInput.addEventListener('change', (e) => {
            const rawFiles = Array.from(e.target.files);
            if (rawFiles.length === 0) return;
            const files = rawFiles.filter(f => validateFile(f, 30, ['image/*']));
            if (files.length === 0) { e.target.value = ''; return; }
            convertFilesQueue = files;
            if(convertQueueStatus) convertQueueStatus.textContent = `已添加 ${files.length} 个文件至队列`;
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    originalConvertImageFirst = img;
                    originalRatio = img.width / img.height;
                    const sizeLabel = document.getElementById('convertOriginalSize');
                    if(sizeLabel) sizeLabel.textContent = `首图原尺寸: ${img.width} × ${img.height} px`;
                    if(convertWidth) { convertWidth.value = img.width; convertWidth.disabled = false; }
                    if(convertHeight) { convertHeight.value = img.height; convertHeight.disabled = false; }
                    if(convertPlaceholder) convertPlaceholder.classList.add('hidden');
                    if(convertDownloadBtn) convertDownloadBtn.disabled = false;
                    updateConvertCanvas();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(files[0]);
        });
    }

    if(convertWidth) {
        convertWidth.addEventListener('input', () => {
            if (!originalConvertImageFirst) return;
            let w = parseInt(convertWidth.value) || 1;
            if (lockRatio && lockRatio.checked && convertHeight) { convertHeight.value = Math.round(w / originalRatio); }
            updateConvertCanvas();
        });
    }
    if(convertHeight) {
        convertHeight.addEventListener('input', () => {
            if (!originalConvertImageFirst) return;
            let h = parseInt(convertHeight.value) || 1;
            if (lockRatio && lockRatio.checked && convertWidth) { convertWidth.value = Math.round(h * originalRatio); }
            updateConvertCanvas();
        });
    }
    if(formatSelect) {
        formatSelect.addEventListener('change', () => {
            if (!qualityControl || !qualityRange) return;
            if (formatSelect.value === 'image/png') { qualityControl.style.opacity = '0.4'; qualityRange.disabled = true; }
            else { qualityControl.style.opacity = '1'; qualityRange.disabled = false; }
            updateConvertCanvas();
        });
    }
    if(qualityRange) {
        qualityRange.addEventListener('input', (e) => { if(qualityValue) qualityValue.textContent = e.target.value + '%'; updateConvertCanvas(); });
    }

    if(convertDownloadBtn) {
        convertDownloadBtn.addEventListener('click', async () => {
            if (convertFilesQueue.length === 0) return;
            const originalText = convertDownloadBtn.textContent;
            convertDownloadBtn.textContent = `正在打包 ${convertFilesQueue.length} 个文件...`;
            convertDownloadBtn.disabled = true;
            try {
                const zip = new window.JSZip();
                const format = formatSelect ? formatSelect.value : 'image/jpeg';
                const ext = format === 'image/jpeg' ? 'jpg' : format.split('/')[1];
                const quality = qualityRange ? parseInt(qualityRange.value) / 100 : 0.9;
                const targetW = parseInt(convertWidth.value) || 1;
                const targetH = parseInt(convertHeight.value) || 1;
                for(let i=0; i<convertFilesQueue.length; i++) {
                    const file = convertFilesQueue[i];
                    await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const img = new Image();
                            img.onload = () => {
                                const offCanvas = document.createElement('canvas');
                                offCanvas.width = targetW; offCanvas.height = targetH;
                                const offCtx = offCanvas.getContext('2d');
                                if (format === 'image/jpeg') { offCtx.fillStyle = '#FFFFFF'; offCtx.fillRect(0, 0, targetW, targetH); }
                                offCtx.drawImage(img, 0, 0, targetW, targetH);
                                const dataUrl = offCanvas.toDataURL(format, quality);
                                const blob = dataURLtoBlob(dataUrl);
                                let baseName = file.name.substring(0, file.name.lastIndexOf('.')) || `image_${i}`;
                                zip.file(`${baseName}_converted.${ext}`, blob);
                                resolve();
                            };
                            img.src = e.target.result;
                        };
                        reader.readAsDataURL(file);
                    });
                }
                const content = await zip.generateAsync({type:"blob"});
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = `批量转换打包_${Date.now()}.zip`;
                link.click();
                URL.revokeObjectURL(link.href);
                if (window.trackFeatureUse) window.trackFeatureUse('converter_export', 'ok');
                showToast('🎉 批量转换打包完成！', 'success');
            } catch (err) {
                console.error("ZIP打包出错:", err);
                if (window.trackFeatureUse) window.trackFeatureUse('converter_export', 'fail');
                showToast('❌ 批量打包失败，请检查浏览器支持。', 'error');
            } finally {
                convertDownloadBtn.textContent = originalText;
                convertDownloadBtn.disabled = false;
            }
        });
    }
}
