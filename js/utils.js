// js/utils.js

const htmlEl = document.documentElement;
let toastContainer = null;

export function showToast(message, type = 'info') {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'fixed top-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    const bgClass = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-slate-800 dark:bg-slate-700';
    toast.className = `pointer-events-auto ${bgClass} text-white text-sm px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm transition-all duration-300 transform translate-x-full opacity-0`;
    const span = document.createElement('span');
    span.textContent = message;
    toast.appendChild(span);
    toastContainer.appendChild(toast);
    requestAnimationFrame(() => {
        toast.classList.remove('translate-x-full', 'opacity-0');
    });
    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function validateFile(file, maxSizeMb = 50, allowedTypes = []) {
    if (!file) return false;
    
    // 验证文件类型
    if (allowedTypes.length > 0) {
        const fileType = file.type.toLowerCase();
        const fileName = file.name.toLowerCase();
        
        const isAllowedType = allowedTypes.some(type => {
            if (type.startsWith('.')) {
                return fileName.endsWith(type);
            }
            if (type.endsWith('/*')) {
                const prefix = type.slice(0, -2);
                return fileType.startsWith(prefix);
            }
            return fileType === type;
        });
        
        if (!isAllowedType) {
            showToast(`❌ 不支持的文件格式！支持的格式：${allowedTypes.join(', ')}`, 'error');
            return false;
        }
    }
    
    // 验证文件大小
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showToast(`❌ 文件过大！请上传不超过 ${maxSizeMb}MB 的文件。`, 'error');
        return false;
    }
    
    return true;
}

export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function syncThemeToIframes(theme) {
    const iframes = ['iframe-typing', 'iframe-ittools', 'iframe-pdf', 'iframe-dosgame'];
    iframes.forEach(id => {
        const iframe = document.getElementById(id);
        if (iframe && iframe.contentWindow) {
            try {
                iframe.contentWindow.postMessage({ type: 'theme-change', theme: theme }, '*');
            } catch(e){}
        }
    });
}

export function toggleTheme() {
    const isDark = htmlEl.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    syncThemeToIframes(theme);
}

export function initTheme() {
    ['sidebarThemeToggleBtn', 'mobileThemeToggleBtn'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', toggleTheme);
    });
    // 同步初始化 iframe 的主题
    const currentTheme = htmlEl.classList.contains('dark') ? 'dark' : 'light';
    syncThemeToIframes(currentTheme);
}

export function bindDragAndDrop(dropZoneId, inputId) {
    const dropZone = document.getElementById(dropZoneId);
    const input = document.getElementById(inputId);
    if(!dropZone || !input) return;
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
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            input.files = e.dataTransfer.files;
            input.dispatchEvent(new Event('change'));
        }
    });
    dropZone.addEventListener('click', () => {
        input.click();
    });
    input.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

export function copyTextToClipboard(text, successMsg = '内容已复制到剪贴板') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('✅ ' + successMsg);
        }).catch(err => {
            console.error('复制出错', err);
            fallbackCopyText(text);
        });
    } else {
        fallbackCopyText(text);
    }
}

function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed"; 
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showToast('✅ 内容已复制到剪贴板');
    } catch (err) {
        showToast('❌ 复制失败，请手动选择复制');
    }
    document.body.removeChild(textArea);
}

// 导出到全局以维持 HTML 内联事件兼容性
window.showToast = showToast;
window.validateFile = validateFile;
window.formatBytes = formatBytes;
window.copyTextToClipboard = copyTextToClipboard;
window.toggleTheme = toggleTheme;
