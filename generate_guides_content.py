# -*- coding: utf-8 -*-
"""
generate_guides_content.py
批量构建超级工具箱 Pro 实用指南与知识中心 (/guides/)
包括指南聚合门户与 8 篇高价值深度图文教程，用于 SEO 获客与 AdSense 质量达标。
"""

import os

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
GUIDES_DIR = os.path.join(REPO_ROOT, "guides")
os.makedirs(GUIDES_DIR, exist_ok=True)

ADSENSE_SCRIPT = """    <!-- Google AdSense -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1476528036081443"
     crossorigin="anonymous"></script>"""

COMMON_HEAD = """    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="author" content="超级工具箱 Pro 技术团队">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="manifest" href="/manifest.json">
    <link rel="icon" type="image/svg+xml" href="/icons/icon.svg">
    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
    <meta name="theme-color" content="#4f46e5" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#09090b" media="(prefers-color-scheme: dark)">
    <!-- Tailwind CSS (本地部署) -->
    <script src="/models/tailwindcss.js?v=1.1"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        darkBg: '#09090b',
                        darkCard: '#18181b',
                        darkBorder: '#27272a'
                    }
                }
            }
        }
    </script>
    <!-- FontAwesome 图标库 -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" crossorigin="anonymous">
""" + ADSENSE_SCRIPT

COMMON_NAV = """    <!-- 顶部全局导航栏 -->
    <header class="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-40 transition-colors">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <a href="/" class="flex items-center gap-2.5 group" title="返回超级工具箱首页">
                    <div class="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                        <i class="fas fa-toolbox"></i>
                    </div>
                    <span class="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-100">超级工具箱 <span class="text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Pro</span></span>
                </a>
                <span class="text-zinc-300 dark:text-zinc-700 hidden sm:inline">/</span>
                <a href="/guides/" class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hidden sm:inline flex items-center gap-1.5 hover:underline">
                    <i class="fas fa-book-open"></i> 实用指南与知识库
                </a>
            </div>

            <!-- 快捷工具导航 -->
            <nav class="hidden md:flex items-center gap-4 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <a href="/bg-remover/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">智能抠图换底</a>
                <a href="/ocr/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">离线 OCR 识别</a>
                <a href="/pdf-tools/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">PDF 工具箱</a>
                <a href="/qr/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">艺术二维码</a>
                <a href="/collage/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">长图排版</a>
                <a href="/image-converter/" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">批量转换压缩</a>
            </nav>

            <!-- 右侧深色模式切换与返回首页 -->
            <div class="flex items-center gap-2">
                <button onclick="toggleTheme()" class="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 transition-colors" title="切换深色/浅色模式">
                    <i class="fas fa-moon dark:hidden text-xs"></i>
                    <i class="fas fa-sun hidden dark:block text-xs text-amber-400"></i>
                </button>
                <a href="/" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition-colors">
                    <i class="fas fa-arrow-left"></i> 开启工具
                </a>
            </div>
        </div>
    </header>
"""

COMMON_FOOTER = """    <!-- 全局页脚 -->
    <footer class="w-full bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 mt-16 transition-colors">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                <div class="flex items-center gap-2 font-semibold text-zinc-700 dark:text-zinc-300">
                    <i class="fas fa-shield-halved text-emerald-500"></i> 纯本地离线隐私保护 · 文件 100% 不上传云端
                </div>
                <div class="flex flex-wrap items-center justify-center gap-4">
                    <a href="/" class="hover:underline">工具箱首页</a>
                    <a href="/guides/" class="hover:underline text-emerald-600 dark:text-emerald-400 font-semibold">实用指南中心</a>
                    <a href="/about.html" class="hover:underline">关于我们</a>
                    <a href="/privacy.html" class="hover:underline">隐私政策</a>
                    <a href="/terms.html" class="hover:underline">服务条款</a>
                    <a href="/contact.html" class="hover:underline">联系方式</a>
                </div>
            </div>
            <div class="pt-6 border-t border-zinc-100 dark:border-zinc-800/80 text-center text-[11px] text-zinc-400 dark:text-zinc-500 space-y-2">
                <p>© 2026 超级工具箱 Pro (hhdzai.top) 版权所有 · 基于 WebAssembly 与纯前端客户端技术驱动</p>
                <div class="flex flex-wrap items-center justify-center gap-3">
                    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" class="hover:underline">闽ICP备2026017857号</a>
                    <span>·</span>
                    <a href="https://beian.mps.gov.cn/#/query/webSearch?code=35080202351547" target="_blank" rel="noopener noreferrer" class="hover:underline">闽公网安备35080202351547号</a>
                </div>
            </div>
        </div>
    </footer>

    <!-- 深色模式全局控制脚本 -->
    <script>
        function toggleTheme() {
            const html = document.documentElement;
            if (html.classList.contains('dark')) {
                html.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                html.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
        }
        if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            document.documentElement.classList.add('dark');
        }
    </script>
"""

print("[+] Template foundation ready.")
