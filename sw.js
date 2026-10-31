// sw.js - 超级工具箱 Pro Service Worker
const CACHE_NAME = 'super-toolbox-cache-v3.4';

// 核心预缓存文件清单 (精简高效，不塞入 11MB Worker 文件，秒级完成安装)
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/bg-remover/index.html',
    '/ocr/index.html',
    '/pdf-tools/index.html',
    '/qr/index.html',
    '/collage/index.html',
    '/image-converter/index.html',
    '/privacy.html',
    '/terms.html',
    '/about.html',
    '/contact.html',
    '/404.html',
    '/manifest.json',
    '/icons/icon.svg',
    '/opencv-esm-wrapper.js',
    '/libs/docx.umd.js',
    '/libs/xlsx.full.min.js',
    '/libs/exif.min.js',
    '/js/main.js',
    '/js/utils.js',
    '/js/authService.js',
    '/js/creditService.js',
    '/js/configService.js',
    '/js/adManager.js',
    '/js/tracker.js',
    '/js/i18n.js',
    '/js/ocr.js',
    '/js/pdfTools.js',
    '/js/qrCode.js',
    '/js/bgRemover.js',
    '/js/collage.js',
    '/js/converter.js',
    '/js/enhancer.js',
    '/locales/zh-CN.json',
    '/locales/en-US.json',
    '/models/tailwindcss.js?v=1.1',
    '/models/paddleocr.js',
    '/models/clipper.js?v=1.1',
    '/models/js-yaml.js?v=1.1',
    '/models/ort.js?v=1.1',
    '/models/jsQR.min.js',
    '/models/qr-code-styling.min.js',
    '/models/pdf.worker.min.js',
    '/models/pdf-lib.min.js'
];

// 1. 安装阶段：预缓存核心静态应用外壳
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Precache partial error (ignored):', err);
            });
        })
    );
});

// 2. 激活阶段：清理旧版本缓存并接管控制
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && !key.startsWith('ocr-models-cache')) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. 拦截请求：针对 API 走网络，静态文件与模型优先缓存实现离线可用
self.addEventListener('fetch', (event) => {
    const req = event.request;
    const url = new URL(req.url);

    // 忽略非 GET 请求
    if (req.method !== 'GET') return;

    // API 请求直通网络，不进行静态缓存
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // 绝不加载旧版残留的 10MB 主线程 opencv.js，秒级拦截阻断，绝对防止主线程卡死
    if (url.pathname.includes('opencv.js')) {
        event.respondWith(new Response('// opencv.js is disabled on main thread', {
            status: 200,
            headers: { 'Content-Type': 'application/javascript' }
        }));
        return;
    }

    // 页面导航请求：网络优先，断网降级为本地缓存的 index.html
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // 核心业务 JS 与国际化语言包：采用 Stale-While-Revalidate 策略
    // 既实现离线秒开，又在后台静默发起网络拉取更新缓存，避免老用户长期运行旧版本 JS
    if (url.pathname.startsWith('/js/') || url.pathname.startsWith('/locales/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cached = await cache.match(req);
                const fetchPromise = fetch(req).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(req, networkResponse.clone()).catch(() => {});
                    }
                    return networkResponse;
                }).catch(() => null);

                // 优先返回缓存（保证快速渲染），同时后台刷新；若无缓存则等待网络返回
                if (cached) return cached;
                const networkRes = await fetchPromise;
                return networkRes || new Response('Offline: resource unavailable', { status: 503 });
            })
        );
        return;
    }

    // 其它静态文件与第三方资源：缓存优先，未命中走网络并缓存
    event.respondWith(
        caches.match(req).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(req).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    // 仅缓存 http 和 https 请求，忽略 chrome-extension 等插件请求
                    if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
                        const resClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => {});
                    }
                }
                return networkResponse;
            }).catch(() => {
                return new Response('Offline: resource unavailable', { status: 503 });
            });
        })
    );
});
