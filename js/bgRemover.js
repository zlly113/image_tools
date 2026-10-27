// js/bgRemover.js
import { showToast, validateFile, bindDragAndDrop } from './utils.js';

let originalBgImage = null;
let originalBgImageCanvas = null;
let originalBgImageCtx = null;
let customBgColor = null;
let activeReplaceBg = 'transparent';

export function initBgRemover() {
    const bgDropZone = document.getElementById('bgDropZone');
    const bgImageInput = document.getElementById('bgImageInput');
    const bgPreviewCanvas = document.getElementById('bgPreviewCanvas');
    const bgPlaceholder = document.getElementById('bgPlaceholder');
    const bgDownloadBtn = document.getElementById('bgDownloadBtn');
    const bgToleranceRange = document.getElementById('bgToleranceRange');
    const bgToleranceVal = document.getElementById('bgToleranceVal');
    const bgModeSelect = document.getElementById('bgModeSelect');

    // 绑定拖拽与点击上传事件
    bindDragAndDrop('bgDropZone', 'bgImageInput');

    if (bgImageInput) {
        bgImageInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!validateFile(file, 50, ['image/*'])) {
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const maxDim = 1200;
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

                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = width;
                    tempCanvas.height = height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(img, 0, 0, width, height);

                    originalBgImage = tempCanvas;
                    originalBgImageCanvas = document.createElement('canvas');
                    originalBgImageCanvas.width = width;
                    originalBgImageCanvas.height = height;
                    originalBgImageCtx = originalBgImageCanvas.getContext('2d');
                    originalBgImageCtx.drawImage(tempCanvas, 0, 0);

                    customBgColor = null;
                    if (bgPreviewCanvas) bgPreviewCanvas.classList.add('cursor-crosshair');

                    updateBgColorUI();
                    processBgImage();
                };
                img.onerror = () => {
                    showToast('❌ 图像解析失败，请重新选择');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    if (bgToleranceRange && bgToleranceVal) {
        bgToleranceRange.addEventListener('input', (e) => {
            bgToleranceVal.textContent = e.target.value;
            processBgImage();
        });
    }

    if (bgModeSelect) {
        bgModeSelect.addEventListener('change', () => {
            processBgImage();
        });
    }

    if (bgPreviewCanvas) {
        bgPreviewCanvas.addEventListener('click', (e) => {
            if (!originalBgImage || !originalBgImageCtx) return;
            const rect = bgPreviewCanvas.getBoundingClientRect();
            const scaleX = originalBgImage.width / rect.width;
            const scaleY = originalBgImage.height / rect.height;
            const clickX = Math.floor((e.clientX - rect.left) * scaleX);
            const clickY = Math.floor((e.clientY - rect.top) * scaleY);

            const pixel = originalBgImageCtx.getImageData(clickX, clickY, 1, 1).data;
            customBgColor = { r: pixel[0], g: pixel[1], b: pixel[2] };

            const resetBtn = document.getElementById('resetBgColorBtn');
            if (resetBtn) resetBtn.classList.remove('hidden');

            showToast(`已取 RGB(${pixel[0]}, ${pixel[1]}, ${pixel[2]}) 为去底色`);
            processBgImage();
        });
    }

    const resetBtnEl = document.getElementById('resetBgColorBtn');
    if (resetBtnEl) {
        resetBtnEl.addEventListener('click', () => {
            customBgColor = null;
            resetBtnEl.classList.add('hidden');
            showToast('已重置为默认自动取色');
            processBgImage();
        });
    }

    if (bgDownloadBtn) {
        bgDownloadBtn.addEventListener('click', () => {
            if (!originalBgImage || !bgPreviewCanvas) return;
            const link = document.createElement('a');
            const format = activeReplaceBg === 'transparent' ? 'image/png' : 'image/jpeg';
            const ext = format === 'image/png' ? 'png' : 'jpg';
            link.href = bgPreviewCanvas.toDataURL(format, 0.95);
            link.download = `证件照合成_${Date.now()}.${ext}`;
            link.click();
            if (window.trackFeatureUse) window.trackFeatureUse('bg_remover_export', 'ok');
            showToast('🎉 图片保存成功！');
        });
    }

    // 绑定背景替换颜色与自定义图片按钮事件
    document.querySelectorAll('.bg-replace-btn').forEach(btn => {
        const customInput = btn.querySelector('#bgCustomImageInput');
        if (customInput) {
            customInput.addEventListener('change', (e) => {
                const file = e.target.files && e.target.files[0];
                if (!file) return;
                if (!validateFile(file, 50, ['image/*'])) {
                    e.target.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        setReplaceBg(img, btn);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            });
        } else {
            btn.addEventListener('click', () => {
                const color = btn.getAttribute('data-bg');
                if (color) {
                    setReplaceBg(color, btn);
                }
            });
        }
    });
}

function setReplaceBg(color, el) {
    activeReplaceBg = color;
    document.querySelectorAll('.bg-replace-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-1', 'ring-offset-2');
    });
    if (el) el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2');
    processBgImage();
}

function updateBgColorUI() {
    const resetBtn = document.getElementById('resetBgColorBtn');
    if (resetBtn) {
        if (customBgColor) resetBtn.classList.remove('hidden');
        else resetBtn.classList.add('hidden');
    }
}

function processBgImage() {
    const bgPreviewCanvas = document.getElementById('bgPreviewCanvas');
    const bgPlaceholder = document.getElementById('bgPlaceholder');
    const bgDownloadBtn = document.getElementById('bgDownloadBtn');
    const bgToleranceRange = document.getElementById('bgToleranceRange');
    const bgModeSelect = document.getElementById('bgModeSelect');

    if (!originalBgImage || !bgPreviewCanvas) return;

    const bgCtx = bgPreviewCanvas.getContext('2d');
    if (!bgCtx) return;

    bgPreviewCanvas.classList.remove('hidden');
    bgPreviewCanvas.style.display = 'block';
    if (bgPlaceholder) {
        bgPlaceholder.classList.add('hidden');
        bgPlaceholder.style.display = 'none';
    }
    if (bgDownloadBtn) bgDownloadBtn.disabled = false;

    const width = originalBgImage.width;
    const height = originalBgImage.height;
    bgPreviewCanvas.width = width;
    bgPreviewCanvas.height = height;

    // 1. 背景层绘制
    bgCtx.clearRect(0, 0, width, height);
    if (activeReplaceBg === 'transparent') {
        // keep clear
    } else if (typeof activeReplaceBg === 'string') {
        bgCtx.fillStyle = activeReplaceBg;
        bgCtx.fillRect(0, 0, width, height);
    } else if (activeReplaceBg && activeReplaceBg.width) {
        const imgRatio = activeReplaceBg.width / activeReplaceBg.height;
        const canvasRatio = width / height;
        let drawW = width, drawH = height, drawX = 0, drawY = 0;
        if (imgRatio > canvasRatio) {
            drawH = height; drawW = height * imgRatio; drawX = (width - drawW) / 2;
        } else {
            drawW = width; drawH = width / imgRatio; drawY = (height - drawH) / 2;
        }
        bgCtx.drawImage(activeReplaceBg, drawX, drawY, drawW, drawH);
    }

    // 2. 前景层抠图处理
    const fgCanvas = document.createElement('canvas');
    fgCanvas.width = width; fgCanvas.height = height;
    const fgCtx = fgCanvas.getContext('2d');
    fgCtx.drawImage(originalBgImage, 0, 0);

    try {
        const imageData = fgCtx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const tolerance = parseInt(bgToleranceRange ? bgToleranceRange.value : 30, 10);
        const mode = bgModeSelect ? bgModeSelect.value : 'floodfill';

        let bgR = data[0], bgG = data[1], bgB = data[2];
        if (customBgColor) {
            bgR = customBgColor.r; bgG = customBgColor.g; bgB = customBgColor.b;
        }

        const isBgColorLocal = (idx) => {
            return Math.abs(data[idx] - bgR) <= tolerance &&
                   Math.abs(data[idx+1] - bgG) <= tolerance &&
                   Math.abs(data[idx+2] - bgB) <= tolerance &&
                   data[idx+3] > 0;
        };

        if (mode === 'all') {
            for (let i = 0; i < data.length; i += 4) {
                if (isBgColorLocal(i)) data[i+3] = 0;
            }
        } else {
            const visited = new Uint8Array(width * height);
            const stack = [];

            for (let x = 0; x < width; x++) {
                let t = 0 * width + x; if (isBgColorLocal(t * 4)) { stack.push(t); visited[t] = 1; }
                let b = (height - 1) * width + x; if (isBgColorLocal(b * 4)) { stack.push(b); visited[b] = 1; }
            }
            for (let y = 0; y < height; y++) {
                let l = y * width + 0; if (isBgColorLocal(l * 4)) { stack.push(l); visited[l] = 1; }
                let r = y * width + (width - 1); if (isBgColorLocal(r * 4)) { stack.push(r); visited[r] = 1; }
            }

            while (stack.length > 0) {
                const curr = stack.pop();
                const cx = curr % width;
                const cy = Math.floor(curr / width);

                data[curr * 4 + 3] = 0;

                if (cx > 0) { let left = curr - 1; if (!visited[left] && isBgColorLocal(left * 4)) { visited[left] = 1; stack.push(left); } }
                if (cx < width - 1) { let right = curr + 1; if (!visited[right] && isBgColorLocal(right * 4)) { visited[right] = 1; stack.push(right); } }
                if (cy > 0) { let top = curr - width; if (!visited[top] && isBgColorLocal(top * 4)) { visited[top] = 1; stack.push(top); } }
                if (cy < height - 1) { let bottom = curr + width; if (!visited[bottom] && isBgColorLocal(bottom * 4)) { visited[bottom] = 1; stack.push(bottom); } }
            }
        }
        fgCtx.putImageData(imageData, 0, 0);
        bgCtx.drawImage(fgCanvas, 0, 0);
    } catch (err) {
        bgCtx.drawImage(originalBgImage, 0, 0);
    }
}

// Expose to window for inline onclick handler
window.setReplaceBg = setReplaceBg;
