// js/collage.js
import { showToast, validateFile, bindDragAndDrop } from './utils.js';
import { t } from './i18n.js';

let collageInput = null;
let collageCountText = null;
let collageThumbnails = null;
let collageThumbEmpty = null;
let layoutRadios = null;
let spacingRange = null;
let spacingValue = null;
let radiusRange = null;
let radiusValue = null;
let bgColorPickerCollage = null;
let bgColorHexCollage = null;
let exifToggle = null;

let collageCanvas = null;
let collageCtx = null;
let collagePlaceholder = null;
let collageDownloadBtn = null;

let loadedImagesObj = [];

window.addEventListener('locale-changed', () => {
    if(collageCountText) {
        const countTpl = t('collage.count_text') || '已选择: {count} 张';
        collageCountText.textContent = countTpl.replace('{count}', loadedImagesObj.length);
    }
});

function getExifData(file) {
    return new Promise((resolve) => {
        if (window.EXIF) {
            window.EXIF.getData(file, function() {
                const make = window.EXIF.getTag(this, "Make") || "未知设备";
                const model = window.EXIF.getTag(this, "Model") || "";
                const fNumber = window.EXIF.getTag(this, "FNumber");
                const focalLength = window.EXIF.getTag(this, "FocalLength");
                const iso = window.EXIF.getTag(this, "ISOSpeedRatings");
                const exposureTime = window.EXIF.getTag(this, "ExposureTime");
                
                let apertureStr = fNumber ? `F${fNumber.valueOf()}` : "";
                let focalStr = focalLength ? `${focalLength.valueOf()}mm` : "";
                let isoStr = iso ? `ISO${iso}` : "";
                let exposureStr = exposureTime ? `1/${Math.round(1/exposureTime.valueOf())}s` : "";
                let params = [focalStr, apertureStr, exposureStr, isoStr].filter(v=>v).join("  ");
                resolve({ device: `${make} ${model}`.trim(), params });
            });
        } else {
            resolve({ device: "未知设备", params: "" });
        }
    });
}

function renderThumbnails() {
    if (!collageThumbnails) return;
    if(loadedImagesObj.length > 0) {
        if (collageThumbEmpty) collageThumbEmpty.style.display = 'none';
    } else {
        if (collageThumbEmpty) collageThumbEmpty.style.display = 'block';
    }
    Array.from(collageThumbnails.children).forEach(child => { if(child.id !== 'collageThumbEmpty') child.remove(); });
    loadedImagesObj.forEach((item, index) => {
        const thumb = document.createElement('div');
        thumb.className = "w-14 h-14 relative rounded overflow-hidden cursor-move border border-gray-300 dark:border-slate-600 shadow-sm hover:ring-2 ring-indigo-500";
        thumb.draggable = true; thumb.dataset.index = index;
        const img = document.createElement('img');
        img.src = item.img.src; img.className = "w-full h-full object-cover";
        const delBtn = document.createElement('div');
        delBtn.className = "absolute top-0 right-0 bg-red-500/80 text-white w-4 h-4 flex items-center justify-center text-[10px] cursor-pointer hover:bg-red-600 rounded-bl";
        delBtn.innerHTML = "×";
        delBtn.onclick = (e) => { e.stopPropagation(); loadedImagesObj.splice(index, 1); updateCollageState(); };
        thumb.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', index); thumb.style.opacity = '0.5'; });
        thumb.addEventListener('dragend', () => { thumb.style.opacity = '1'; });
        thumb.addEventListener('dragover', (e) => e.preventDefault());
        thumb.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            if (fromIdx !== index) {
                const m = loadedImagesObj.splice(fromIdx, 1)[0];
                loadedImagesObj.splice(index, 0, m);
                updateCollageState();
            }
        });
        thumb.appendChild(img); thumb.appendChild(delBtn); collageThumbnails.appendChild(thumb);
    });
    if(collageCountText) {
        const countTpl = t('collage.count_text') || '已选择: {count} 张';
        collageCountText.textContent = countTpl.replace('{count}', loadedImagesObj.length);
    }
}

function updateCollageState() { renderThumbnails(); drawCollage(); }

function roundedImage(ctx, img, x, y, width, height, radius) {
    ctx.save(); ctx.beginPath(); ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y); ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius); ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath(); ctx.clip();
    ctx.drawImage(img, x, y, width, height); ctx.restore();
}

function drawExifWatermark(ctx, exifData, x, y, width, height) {
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y, width, height);
    ctx.fillStyle = "#1e1e1e"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const deviceFontSize = Math.max(16, width * 0.02);
    ctx.font = `bold ${deviceFontSize}px sans-serif`;
    ctx.fillText(exifData.device, x + width * 0.05, y + height / 2);
    ctx.textAlign = "right";
    const paramFontSize = Math.max(14, width * 0.015);
    ctx.font = `${paramFontSize}px sans-serif`; ctx.fillStyle = "#555555";
    ctx.fillText(exifData.params, x + width * 0.95, y + height / 2);
}

function drawCollage() {
    if (!collageCtx || !collageCanvas) return;
    if (loadedImagesObj.length === 0) {
        collageCanvas.classList.add('hidden');
        if(collagePlaceholder) collagePlaceholder.classList.remove('hidden');
        if(collageDownloadBtn) collageDownloadBtn.disabled = true;
        return;
    }
    collageCanvas.classList.remove('hidden');
    if(collagePlaceholder) collagePlaceholder.classList.add('hidden');
    if(collageDownloadBtn) collageDownloadBtn.disabled = false;
    let layout = 'vertical';
    if(layoutRadios) layoutRadios.forEach(r => { if(r.checked) layout = r.value; });
    const spacing = parseInt(spacingRange ? spacingRange.value : 20, 10);
    const radius = parseInt(radiusRange ? radiusRange.value : 0, 10);
    const bgColor = bgColorPickerCollage ? bgColorPickerCollage.value : '#ffffff';
    const withExif = exifToggle ? exifToggle.checked : false;
    let finalWidth = 0, finalHeight = 0;
    const padding = spacing;

    if (layout === 'vertical') {
        const targetWidth = 1000;
        finalWidth = targetWidth + padding * 2;
        finalHeight = padding;
        const resizedImages = loadedImagesObj.map(item => {
            const scale = targetWidth / item.img.width;
            let height = item.img.height * scale;
            let exifHeight = withExif ? Math.max(80, targetWidth * 0.08) : 0;
            let itemTotalHeight = height + exifHeight;
            finalHeight += itemTotalHeight + spacing;
            return { img: item.img, exif: item.exifData, w: targetWidth, h: height, exifH: exifHeight, totalH: itemTotalHeight };
        });
        collageCanvas.width = finalWidth; collageCanvas.height = finalHeight;
        collageCtx.fillStyle = bgColor; collageCtx.fillRect(0, 0, finalWidth, finalHeight);
        let currentY = padding;
        resizedImages.forEach(item => {
            if (withExif) {
                collageCtx.save(); collageCtx.beginPath();
                collageCtx.moveTo(padding + radius, currentY);
                collageCtx.lineTo(padding + item.w - radius, currentY);
                collageCtx.quadraticCurveTo(padding + item.w, currentY, padding + item.w, currentY + radius);
                collageCtx.lineTo(padding + item.w, currentY + item.totalH - radius);
                collageCtx.quadraticCurveTo(padding + item.w, currentY + item.totalH, padding + item.w - radius, currentY + item.totalH);
                collageCtx.lineTo(padding + radius, currentY + item.totalH);
                collageCtx.quadraticCurveTo(padding, currentY + item.totalH, padding, currentY + item.totalH - radius);
                collageCtx.lineTo(padding, currentY + radius);
                collageCtx.quadraticCurveTo(padding, currentY, padding + radius, currentY);
                collageCtx.closePath(); collageCtx.clip();
                collageCtx.drawImage(item.img, padding, currentY, item.w, item.h);
                drawExifWatermark(collageCtx, item.exif, padding, currentY + item.h, item.w, item.exifH);
                collageCtx.restore();
            } else {
                roundedImage(collageCtx, item.img, padding, currentY, item.w, item.h, radius);
            }
            currentY += item.totalH + spacing;
        });
    } else if (layout === 'horizontal') {
         const targetHeight = 800;
         finalHeight = targetHeight + padding * 2;
         finalWidth = padding;
         const resizedImages = loadedImagesObj.map(item => {
            const scale = targetHeight / item.img.height;
            const width = item.img.width * scale;
            finalWidth += width + spacing;
            return { img: item.img, w: width, h: targetHeight };
        });
         let globalExifHeight = withExif ? Math.max(80, finalWidth * 0.05) : 0;
         finalHeight += globalExifHeight;
        collageCanvas.width = finalWidth; collageCanvas.height = finalHeight;
        collageCtx.fillStyle = bgColor; collageCtx.fillRect(0, 0, finalWidth, finalHeight);
        let currentX = padding;
        resizedImages.forEach(item => { roundedImage(collageCtx, item.img, currentX, padding, item.w, item.h, radius); currentX += item.w + spacing; });
        if (withExif) {
            const firstExif = loadedImagesObj[0]?.exifData || {device: "未知设备", params: ""};
            drawExifWatermark(collageCtx, firstExif, padding, padding + targetHeight + padding/2, finalWidth - padding*2, globalExifHeight);
        }
    } else if (layout === 'grid') {
        const count = loadedImagesObj.length;
        let cols = Math.ceil(Math.sqrt(count));
        if (count === 2) cols = 2;
        if (count === 3) cols = 3;
        const rows = Math.ceil(count / cols);
        const cellSize = 600;
        let cellExifH = withExif ? Math.max(60, cellSize * 0.1) : 0;
        finalWidth = cols * cellSize + (cols + 1) * spacing;
        finalHeight = rows * (cellSize + cellExifH) + (rows + 1) * spacing;
        collageCanvas.width = finalWidth; collageCanvas.height = finalHeight;
        collageCtx.fillStyle = bgColor; collageCtx.fillRect(0, 0, finalWidth, finalHeight);
        loadedImagesObj.forEach((item, index) => {
            const col = index % cols; const row = Math.floor(index / cols);
            const x = spacing + col * (cellSize + spacing);
            const y = spacing + row * (cellSize + cellExifH + spacing);
            const scale = Math.max(cellSize / item.img.width, cellSize / item.img.height);
            const drawW = item.img.width * scale; const drawH = item.img.height * scale;
            const dx = (cellSize - drawW) / 2; const dy = (cellSize - drawH) / 2;
            collageCtx.save(); collageCtx.beginPath();
            collageCtx.moveTo(x + radius, y);
            collageCtx.lineTo(x + cellSize - radius, y);
            collageCtx.quadraticCurveTo(x + cellSize, y, x + cellSize, y + radius);
            collageCtx.lineTo(x + cellSize, y + cellSize + cellExifH - radius);
            collageCtx.quadraticCurveTo(x + cellSize, y + cellSize + cellExifH, x + cellSize - radius, y + cellSize + cellExifH);
            collageCtx.lineTo(x + radius, y + cellSize + cellExifH);
            collageCtx.quadraticCurveTo(x, y + cellSize + cellExifH, x, y + cellSize + cellExifH - radius);
            collageCtx.lineTo(x, y + radius);
            collageCtx.quadraticCurveTo(x, y, x + radius, y);
            collageCtx.closePath(); collageCtx.clip();
            collageCtx.drawImage(item.img, x + dx, y + dy, drawW, drawH);
            if (withExif) { drawExifWatermark(collageCtx, item.exifData, x, y + cellSize, cellSize, cellExifH); }
            collageCtx.restore();
        });
    }
}

export function initCollage() {
    collageInput = document.getElementById('collageInput');
    collageCountText = document.getElementById('collageCountText');
    collageThumbnails = document.getElementById('collageThumbnails');
    collageThumbEmpty = document.getElementById('collageThumbEmpty');
    layoutRadios = document.getElementsByName('layout');
    spacingRange = document.getElementById('spacingRange');
    spacingValue = document.getElementById('spacingValue');
    radiusRange = document.getElementById('radiusRange');
    radiusValue = document.getElementById('radiusValue');
    bgColorPickerCollage = document.getElementById('bgColorPickerCollage');
    bgColorHexCollage = document.getElementById('bgColorHexCollage');
    exifToggle = document.getElementById('exifToggle');
    
    collageCanvas = document.getElementById('collageCanvas');
    collageCtx = collageCanvas ? collageCanvas.getContext('2d') : null;
    collagePlaceholder = document.getElementById('collagePlaceholder');
    collageDownloadBtn = document.getElementById('collageDownloadBtn');

    bindDragAndDrop('collageDropZone', 'collageInput');

    if(collageInput) {
        collageInput.addEventListener('change', async (e) => {
            const rawFiles = Array.from(e.target.files);
            if (rawFiles.length === 0) return;
            const files = rawFiles.filter(f => validateFile(f, 30, ['image/*']));
            if (files.length === 0) { e.target.value = ''; return; }
            if(collageCountText) collageCountText.textContent = `加载中...`;
            const readPromises = files.map(file => new Promise(async (resolve) => {
                const reader = new FileReader();
                const exifData = await getExifData(file);
                reader.onload = (event) => { const img = new Image(); img.onload = () => resolve({ id: Date.now()+Math.random(), img, file, exifData }); img.src = event.target.result; };
                reader.readAsDataURL(file);
            }));
            const newItems = await Promise.all(readPromises);
            loadedImagesObj = loadedImagesObj.concat(newItems);
            updateCollageState();
        });
    }

    if(layoutRadios) Array.from(layoutRadios).forEach(radio => radio.addEventListener('change', drawCollage));
    if(exifToggle) exifToggle.addEventListener('change', drawCollage);
    if(spacingRange) spacingRange.addEventListener('input', (e) => { if(spacingValue) spacingValue.textContent = e.target.value + 'px'; drawCollage(); });
    if(radiusRange) radiusRange.addEventListener('input', (e) => { if(radiusValue) radiusValue.textContent = e.target.value + 'px'; drawCollage(); });
    if(bgColorPickerCollage) bgColorPickerCollage.addEventListener('input', (e) => { if(bgColorHexCollage) bgColorHexCollage.textContent = e.target.value.toUpperCase(); drawCollage(); });

    if(collageDownloadBtn) {
        collageDownloadBtn.addEventListener('click', () => {
            if (loadedImagesObj.length === 0 || !collageCanvas) return;
            const link = document.createElement('a');
            link.href = collageCanvas.toDataURL('image/jpeg', 0.95);
            link.download = `排版拼图_${Date.now()}.jpg`;
            link.click();
            if (window.trackFeatureUse) window.trackFeatureUse('collage_export', 'ok');
            showToast('🎉 排版拼图已保存！', 'success');
        });
    }

    // Render initial empty state
    renderThumbnails();
}
