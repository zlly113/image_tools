# -*- coding: utf-8 -*-
"""
build_site_guides.py
生成实用指南中心（guides/index.html）以及全部 8 篇专业长文深度教程。
"""

import os

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
GUIDES_DIR = os.path.join(REPO_ROOT, "guides")
os.makedirs(GUIDES_DIR, exist_ok=True)

from create_all_guides import ARTICLES, COMMON_HEAD, COMMON_NAV, COMMON_FOOTER, ADSENSE_SCRIPT
from build_guides_portal_and_articles import get_article_content_1

# -----------------------------------------------------------------------------
# 2. 文章内容生成器 2 ~ 8
# -----------------------------------------------------------------------------

def get_article_content_2():
    """6寸相纸排版冲印"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            去普通照相馆洗一组一寸证件照（通常 8 张），往往需要收取 20~35 元；但在电商冲印店或街头自助照片打印机上，冲印一张 <strong>标准 6 寸全彩照片只要 0.5 ~ 1 元</strong>！只要学会用标准 6 寸相纸模版排版，您就可以花几毛钱冲印出一整版的 8 张一寸照或 4 张二寸照。本文为您拆解 <strong>标准 6 寸相纸尺寸参数、出血线预留以及 10 秒纯本地零上传自动排版技巧</strong>。
        </p>

        <!-- 目录导读 -->
        <div class="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="fas fa-list-ul text-amber-500"></i> 本文目录导读
            </h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="#section-1" class="hover:text-amber-500 transition-colors">一、6 寸相纸标准参数（物理尺寸与 300DPI 分辨率）</a></li>
                <li><a href="#section-2" class="hover:text-amber-500 transition-colors">二、三大经典黄金排版组合方案</a></li>
                <li><a href="#section-3" class="hover:text-amber-500 transition-colors">三、冲印避坑：为什么要预留“裁切出血线”与间隙？</a></li>
                <li><a href="#section-4" class="hover:text-amber-500 transition-colors">四、使用超级工具箱 Pro 纯本地排版实操演示</a></li>
                <li><a href="#section-5" class="hover:text-amber-500 transition-colors">五、在线冲印与自带打印机设置技巧</a></li>
            </ul>
        </div>

        <section id="section-1" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">1</span>
                6 寸相纸标准参数（物理尺寸与 300DPI 像素）
            </h2>
            <p>
                市面上最通用、冲印单价最实惠的照片尺寸就是 <strong>6 寸（4R 相纸）</strong>。要保证冲印出来的证件照清晰锐利不模糊，必须满足 <strong>300 DPI (点/英寸)</strong> 的印刷级解析度。
            </p>
            <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table class="w-full text-left text-xs sm:text-sm">
                    <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold">
                        <tr>
                            <th class="p-3.5">相纸规格</th>
                            <th class="p-3.5">物理尺寸 (mm)</th>
                            <th class="p-3.5">物理尺寸 (英寸)</th>
                            <th class="p-3.5">300 DPI 对应像素</th>
                            <th class="p-3.5">容纳证件照数量</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">标准 6 寸 (4R)</td>
                            <td class="p-3.5">152mm × 102mm</td>
                            <td class="p-3.5">6 英寸 × 4 英寸</td>
                            <td class="p-3.5 font-mono text-indigo-600 dark:text-indigo-400 font-bold">1800 × 1200 px</td>
                            <td class="p-3.5">一寸照 8~10 张 / 二寸照 4 张</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">大 6 寸 (4D / 全景)</td>
                            <td class="p-3.5">152mm × 114mm</td>
                            <td class="p-3.5">6 英寸 × 4.5 英寸</td>
                            <td class="p-3.5 font-mono">1800 × 1350 px</td>
                            <td class="p-3.5">一寸照 8 张 + 二寸照 2 张</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">标准 5 寸 (3R)</td>
                            <td class="p-3.5">127mm × 89mm</td>
                            <td class="p-3.5">5 英寸 × 3.5 英寸</td>
                            <td class="p-3.5 font-mono">1500 × 1050 px</td>
                            <td class="p-3.5">一寸照 4~6 张</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <section id="section-2" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">2</span>
                三大经典黄金排版组合方案
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                        方案 A
                    </div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">纯一寸排版（8 张版）</h4>
                    <p class="text-xs text-zinc-500">2 行 × 4 列均匀排列。每张照片 25×35mm (295×413px)，周围留有 3~5mm 白边裁切线。最适合开学季、简历投递与入职体检。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                        方案 B
                    </div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">纯二寸排版（4 张版）</h4>
                    <p class="text-xs text-zinc-500">2 行 × 2 列对称排列。每张照片 35×49mm (413×579px)，留足四周边距。适合出国签证、毕业证书和职业资格证书备案。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                        方案 C
                    </div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">实用混合版（4 一寸 + 2 二寸）</h4>
                    <p class="text-xs text-zinc-500">左侧排 2 张二寸，右侧排 4 张一寸。一版满足日常所有大小尺寸需求，家庭常备最实用。</p>
                </div>
            </div>
        </section>

        <section id="section-3" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">3</span>
                冲印避坑：为什么要预留“裁切出血线”与间隙？
            </h2>
            <p>
                许多新手自己排版时，将照片紧贴着相纸最外圈边缘放置，或者两张证件照之间完全没有缝隙。拿到洗印成品后往往会出现严重问题：
            </p>
            <ul class="list-disc list-inside space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><strong>机械走纸裁切误差</strong>：激光冲印机在裁切相纸时通常有 1~2 毫米的物理公差。如果画面顶格排版，人像的头顶或肩膀极易被裁切掉一截。</li>
                <li><strong>剪刀裁切无定位线</strong>：如果两张照片边缘相贴，自己拿美工刀剪开一张时，容易破坏相邻另一张照片的尺寸。</li>
                <li><strong>黄金留白法则</strong>：在 1800×1200 画布外圈保留至少 <strong>30~50 像素（约 3mm）的纯白外边框</strong>，照片与照片之间留出 <strong>15~20 像素的细白裁切缝</strong>。</li>
            </ul>
        </section>

        <section id="section-4" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold">4</span>
                使用超级工具箱 Pro 纯本地排版实操演示
            </h2>
            <div class="space-y-3">
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">1</span>
                    <div><strong>准备好裁剪换底后的高清照片</strong>：先通过 <a href="/bg-remover/" class="text-amber-600 font-semibold underline">智能抠图换底色工具</a> 获得一张合规的一寸（295×413）或二寸原图。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">2</span>
                    <div><strong>进入多图排版工具</strong>：打开 <a href="/collage/" class="text-amber-600 font-semibold underline">长图拼接与照片排版工具</a>，导入 8 张一寸照片。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">3</span>
                    <div><strong>设置网格与外边距</strong>：选择“网格排版模式”，列数设为 4，设置外边距为 16px、内间距为 8px，背景色选纯白。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-xs shrink-0">4</span>
                    <div><strong>一键导出 300DPI 超清大图</strong>：点击导出，本地 Canvas 将秒级渲染出标准的 1800×1200 像素高清冲印图，保存为无压缩 PNG 或高质量 JPG。</div>
                </div>
            </div>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-layer-group text-amber-500"></i> 开始排版您的 6 寸冲印照片
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">支持自由网格、自定义内边距与无损 300DPI 极速导出</p>
            </div>
            <a href="/collage/" class="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                免费使用长图排版工具 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_3():
    """PDF隐私与离线提取"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            在现代商业社会中，财务报表、招投标技术方案、劳动合同以及客户身份证扫描件等机密 PDF 文档是企业的核心资产。然而，许多员工为了“图省事”，将包含敏感数据的 PDF 上传到网上的“免费在线 PDF 转换器”。<strong>这一行为极易导致核心数据泄露甚至违反网络安全法</strong>。本文将深度剖析云端转换器的安全盲区，并介绍如何借助现代浏览器纯前端 WebAssembly 技术实现 100% 离线脱网安全识别。
        </p>

        <div class="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="fas fa-list-ul text-emerald-500"></i> 本文核心论点
            </h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="#section-1" class="hover:text-emerald-500 transition-colors">一、云端 PDF 转换网站的 4 大暗藏安全隐患</a></li>
                <li><a href="#section-2" class="hover:text-emerald-500 transition-colors">二、企业涉密文档与商业数据的法定义务</a></li>
                <li><a href="#section-3" class="hover:text-emerald-500 transition-colors">三、纯前端 WebAssembly 沙箱的绝对安全机制</a></li>
                <li><a href="#section-4" class="hover:text-emerald-500 transition-colors">四、真假离线检验法：教你一键抓包验证</a></li>
                <li><a href="#section-5" class="hover:text-emerald-500 transition-colors">五、实操：脱网提取多页 PDF 合同与表格内容</a></li>
            </ul>
        </div>

        <section id="section-1" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">1</span>
                云端在线 PDF 转换网站的 4 大暗藏安全隐患
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2 text-red-500">
                        <i class="fas fa-database"></i> 1. 服务器长期静默持久化存储
                    </h4>
                    <p class="text-xs text-zinc-500">许多网站虽然在主页声明“转换完成后 1 小时自动删除”，但在其后端对象存储、访问日志与备份服务器中往往存在长期缓存镜像，运维人员或黑客一旦渗透即可打包全量文档。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2 text-red-500">
                        <i class="fas fa-brain"></i> 2. 沦为第三方大模型训练语料
                    </h4>
                    <p class="text-xs text-zinc-500">近年来大量低成本在线工具网站背靠商业大模型 API，用户的文档被静默用于知识微调或模型二次训练，企业独特的合同条款、研发配方可能在其他用户的 AI 问答中被吐出。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2 text-red-500">
                        <i class="fas fa-network-wired"></i> 3. 传输链路中间人劫持风险
                    </h4>
                    <p class="text-xs text-zinc-500">若公网环境存在代理抓包或公共 Wi-Fi 证书伪造，几十兆的 PDF 源文件在上传到海外服务器的过程中极易被完整截获。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2 text-red-500">
                        <i class="fas fa-user-ninja"></i> 4. 内部员工非法转卖文档
                    </h4>
                    <p class="text-xs text-zinc-500">国外暗网已有专门倒卖在线转换网站泄露简历、财务报表、医疗单据的黑产链条，受害者根本无法追溯泄密源头。</p>
                </div>
            </div>
        </section>

        <section id="section-3" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">2</span>
                纯前端 WebAssembly 沙箱的绝对安全机制
            </h2>
            <p>
                超级工具箱 Pro 彻底颠覆了传统的“用户上传文件 ➔ 云端计算 ➔ 用户下载结果”模式，采用 <strong>“算法模型下发到浏览器 ➔ 客户端本地闭环运算”</strong> 的离线隐私架构：
            </p>
            <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2 text-xs sm:text-sm text-emerald-900 dark:text-emerald-300">
                <p><strong>技术原理：</strong>当您在网页中打开包含 100 页的合同 PDF 时，现代浏览器通过 <code>File API</code> 将文件二进制直接映射在本地设备内存（RAM）中的 <code>ArrayBuffer</code> 沙箱内。</p>
                <p>底层的 <code>PDF.js</code> 渲染器与轻量化 <code>PaddleOCR WebAssembly</code> 引擎全部在独立的 Web Worker 线程内执行矩阵运算。文件从未离开过您的电脑，没有一比特数据流向外部互联网！</p>
            </div>
        </section>

        <section id="section-4" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">3</span>
                真假离线检验法：教你一键抓包验证
            </h2>
            <p>
                很多网站声称自己“保护隐私”，但其实背地里依然在偷偷上传。超级工具箱 Pro 支持任何安全审计与网络抓包检验：
            </p>
            <ol class="list-decimal list-inside space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><strong>拔网线或开启飞行模式测试</strong>：在首次加载完网页后，直接拔掉网线或断开 Wi-Fi。拖入一份多页 PDF，所有页面依然以每秒数页的速度飞速提取，功能丝毫不受断网影响！</li>
                <li><strong>F12 开发者网络面板验证</strong>：按 <code>F12</code> 键切换到 <code>Network (网络)</code> 选项卡，清空日志后执行 PDF 转换。您会发现没有任何一条 POST 或文件传输请求，实现真正意义上的物理级零泄露。</li>
            </ol>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-shield-halved text-emerald-500"></i> 安全离线提取您的合同与财务 PDF
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">支持多页识别、表格排版保留与一键导出 Word / TXT</p>
            </div>
            <a href="/ocr/" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                开启离线 PDF 提取工具 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_4():
    """PDF合并拆分与无损瘦身"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            日常办公中，我们经常遇到这样的烦心事：需要把几份报销发票或投标附件合并为一个 PDF，打开某些知名在线工具，却提示“免费版最多合并 5 个文件，超过需购买 68 元会员”，或者导出的文档强制盖上巨大的半透明广告水印。本文将介绍如何利用 <strong>纯前端本地内存流处理技术</strong>，彻底打破页数、大小与水印限制，免费无损实现多页 PDF 的批量合并、精准拆分与文档瘦身。
        </p>

        <div class="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="fas fa-list-ul text-red-500"></i> 本文核心要点
            </h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="#section-1" class="hover:text-red-500 transition-colors">一、为什么纯本地操作 PDF 速度比云端快 10 倍？</a></li>
                <li><a href="#section-2" class="hover:text-red-500 transition-colors">二、批量合并几十份 PDF 文件实战工作流</a></li>
                <li><a href="#section-3" class="hover:text-red-500 transition-colors">三、精准拆分与任意页码范围提取技巧</a></li>
                <li><a href="#section-4" class="hover:text-red-500 transition-colors">四、PDF 瘦身与体积压缩的底层原理</a></li>
            </ul>
        </div>

        <section id="section-1" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">1</span>
                为什么纯本地操作 PDF 速度比云端快 10 倍？
            </h2>
            <p>
                PDF 文件的本质是一个高度结构化的流式字典对象集合（Cross-Reference Table 交叉引用表）。传统的云端服务在合并两个各 50MB 的 PDF 时，需要经历：
                <strong>上传 100MB ➔ 服务器排队 ➔ 服务端解析 ➔ 重新下载 100MB</strong>。在家庭宽带或移动网络下，光等待网络传输就需要数分钟。
            </p>
            <p>
                而在超级工具箱 Pro 中，基于 <code>pdf-lib</code> 纯客户端引擎，仅需在您的本地电脑 CPU 与内存中直接拼接数据流指针，<strong>无需上传和下载带宽消耗，几百页的文档合并仅需 1~2 秒即可瞬时完成！</strong>
            </p>
        </section>

        <section id="section-2" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center text-sm font-bold">2</span>
                批量合并几十份 PDF 文件实战工作流
            </h2>
            <ol class="list-decimal list-inside space-y-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li>访问 <a href="/pdf-tools/" class="text-red-500 font-semibold underline">超级工具箱 Pro PDF 工具箱</a>，进入“PDF 合并”面板。</li>
                <li>一次性全选拖入需要合并的 10~50 份 PDF 文件（支持发票、营业执照复印件、技术方案等）。</li>
                <li>在可视化的卡片流中，可自由鼠标拖拽调整文档的前后装订顺序。</li>
                <li>点击“开始合并”，本地内存秒级打包生成合并版，直接无损另存为单一 PDF。</li>
            </ol>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-red-500/10 via-amber-500/10 to-transparent border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-file-pdf text-red-500"></i> 无限制免费处理您的 PDF 文档
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">纯本地处理 · 无页数限制 · 无广告水印 · 极速秒级完成</p>
            </div>
            <a href="/pdf-tools/" class="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                免费使用 PDF 工具箱 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_5():
    """离线OCR技术科普"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            过去很长一段时间，高精度的光学字符识别（OCR）必须依赖百亿参数的服务端大型神经网络，用户每次提取图片文字都需要调用商业云端 API。然而随着 <strong>WebAssembly (WASM)、SIMD 向量化指令加速与 ONNX Runtime Web</strong> 技术的突破，在浏览器沙箱内直接运行经过 INT8 量化的轻量化深度学习模型已成为现实。本文将为您深度解构现代离线 OCR 的底层运行机制。
        </p>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-microchip text-indigo-500"></i> PP-OCR 模型在浏览器的三阶段执行链路
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">阶段一</div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">DBNet 文本检测 (Detection)</h4>
                    <p class="text-xs text-zinc-500">采用可微二值化（Differentiable Binarization）算法，实时分析图像像素梯度，迅速勾勒出倾斜、弯曲或多行文本的多边形包围盒。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">阶段二</div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">方向分类器 (Direction Classifier)</h4>
                    <p class="text-xs text-zinc-500">自动检测文本行是否发生 90°、180° 或 270° 旋转，将其智能校正为符合人类正常阅读习惯的水平均匀文本行。</p>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">阶段三</div>
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm">SVTR 文本识别 (Recognition)</h4>
                    <p class="text-xs text-zinc-500">采用轻量级单视角视觉 Transformer 架构，对中英繁体汉字、数字和特殊标点进行高保真字符预测与概率解码。</p>
                </div>
            </div>
        </section>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-bolt text-indigo-500"></i> 离线 OCR 与传统云端 OCR 性能对比
            </h2>
            <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table class="w-full text-left text-xs sm:text-sm">
                    <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold">
                        <tr>
                            <th class="p-3.5">对比维度</th>
                            <th class="p-3.5">超级工具箱 Pro (本地 WASM OCR)</th>
                            <th class="p-3.5">传统云端 OCR (第三方 SaaS)</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <tr>
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">隐私与数据安全</td>
                            <td class="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">100% 物理级隔离（文件不出内存）</td>
                            <td class="p-3.5 text-red-500">数据需经公网上传至服务器磁盘</td>
                        </tr>
                        <tr>
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">断网可用性</td>
                            <td class="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">支持断网、飞机高铁离线模式运行</td>
                            <td class="p-3.5 text-red-500">断网完全瘫痪</td>
                        </tr>
                        <tr>
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">单张耗时</td>
                            <td class="p-3.5 font-bold">约 0.2 ~ 0.8 秒（无网络往返耗时）</td>
                            <td class="p-3.5">需 1.5 ~ 4 秒（受限于文件上传带宽）</td>
                        </tr>
                        <tr>
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">收费模式</td>
                            <td class="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">永久免费（使用用户自身设备算力）</td>
                            <td class="p-3.5 text-zinc-500">按页计费或高价包月会员</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-bolt text-indigo-500"></i> 亲身体验本地离线文字识别的秒级响应
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">零网络延迟 · 支持图片和多页 PDF · 自动校正方向</p>
            </div>
            <a href="/ocr/" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                开启离线 OCR 识别 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_6():
    """发票报销单识别工作流"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            每个月到财务报销和年终结账节点，成百上千张增值税发票、出租车小票和差旅定额发票往往堆积如山。手动一张张核对录入发票代码、发票号码、开票日期与含税金额，不仅耗费巨量工时，更极易因肉眼疲劳造成录错数字。本文分享一套 <strong>财务人员高效离线批量识别发票单据、自动清洗文字并导出标准 Excel 的实操工作流</strong>。
        </p>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-receipt text-sky-500"></i> 攻克发票识别 3 大顽固痛点
            </h2>
            <div class="space-y-3">
                <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <strong>1. 针式打印机字体断针与浅色字</strong>：许多传统增值税专用发票由针式打印机打印，墨迹较浅或存在断针。在识别前微调图像对比度（增加 +20% 伽马对比），可大幅提升识别率至 99% 以上。
                </div>
                <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <strong>2. 手机拍照反光与纸张折痕</strong>：手机拍照时若开启闪光灯，容易在光滑的发票表面形成白斑强光。建议平铺在办公桌面正上方垂直拍照，或直接使用扫描仪 PDF 电子档导入。
                </div>
                <div class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <strong>3. 表格字段对齐与一键导出 Excel</strong>：超级工具箱 Pro 具备文本空间坐标归纳能力，能够将发票上的抬头、税额、项目名称智能对应成段落结构，方便一键点击“复制全选”直接粘贴进 Excel 电子表格。
                </div>
            </div>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-transparent border border-sky-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-file-invoice-dollar text-sky-500"></i> 立即提效您的财务发票录入工作流
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">纯离线保护企业财报机密 · 支持批量多张发票连续提取</p>
            </div>
            <a href="/ocr/" class="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                使用离线 OCR 提取发票文字 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_7():
    """WebP与AVIF格式横评"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            在 Google 搜索引擎的排名算法中，<strong>Core Web Vitals（核心网页体验）指标（特别是 LCP 最大内容绘制）</strong> 占据着极高的权重。而在几乎所有现代网站中，图片资产占据了网页总传输带宽的 60%~75%。如果依然停留在使用几十年前的传统 PNG 或 JPEG 格式，网页首屏加载将大幅变慢。本文将深度横向测评 <strong>JPEG、PNG、WebP 与新兴的 AVIF 格式</strong>，并提供批量无损压缩实战建议。
        </p>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-arrows-rotate text-purple-500"></i> 四大主流 Web 图片格式综合横向测评
            </h2>
            <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table class="w-full text-left text-xs sm:text-sm">
                    <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold">
                        <tr>
                            <th class="p-3.5">格式标准</th>
                            <th class="p-3.5">底层编码技术</th>
                            <th class="p-3.5">透明通道 (Alpha)</th>
                            <th class="p-3.5">相对体积节省</th>
                            <th class="p-3.5">现代浏览器兼容性</th>
                            <th class="p-3.5">最佳应用场景</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <tr>
                            <td class="p-3.5 font-bold">JPEG / JPG</td>
                            <td class="p-3.5">离散余弦变换 (DCT)</td>
                            <td class="p-3.5 text-red-500">不支持</td>
                            <td class="p-3.5">基准线 (0%)</td>
                            <td class="p-3.5 text-emerald-600 font-bold">100% 全兼容</td>
                            <td class="p-3.5">老旧设备兼容、极速拍照归档</td>
                        </tr>
                        <tr>
                            <td class="p-3.5 font-bold">PNG</td>
                            <td class="p-3.5">DEFLATE (无损压缩)</td>
                            <td class="p-3.5 text-emerald-600 font-bold">完美支持</td>
                            <td class="p-3.5 text-red-500">体积通常偏大 2~5 倍</td>
                            <td class="p-3.5 text-emerald-600 font-bold">100% 全兼容</td>
                            <td class="p-3.5">需要严格像素级透明的图标与图表</td>
                        </tr>
                        <tr class="bg-purple-50/50 dark:bg-purple-950/20 font-medium">
                            <td class="p-3.5 font-bold text-purple-600 dark:text-purple-400">WebP (推荐黄金标准)</td>
                            <td class="p-3.5">VP8 帧内预测</td>
                            <td class="p-3.5 text-emerald-600 font-bold">支持无损透明</td>
                            <td class="p-3.5 text-emerald-600 font-bold">比 JPEG 减小 30%~40%</td>
                            <td class="p-3.5 text-emerald-600 font-bold">98%+ 全面普及</td>
                            <td class="p-3.5">现代网站首屏配图、电商详情图、博客插图</td>
                        </tr>
                        <tr>
                            <td class="p-3.5 font-bold text-indigo-600 dark:text-indigo-400">AVIF (次世代标准)</td>
                            <td class="p-3.5">AV1 视频关键帧帧内预测</td>
                            <td class="p-3.5 text-emerald-600 font-bold">支持高动态 HDR 透明</td>
                            <td class="p-3.5 text-emerald-600 font-bold">比 JPEG 减小 50%~60%</td>
                            <td class="p-3.5">93%+ (新版浏览器普遍支持)</td>
                            <td class="p-3.5">对网站加载速度有极致要求的高流量站点</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-arrows-rotate text-purple-500"></i> 一键批量转换与压缩您的网站图片
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">纯本地批量处理 · 保持透明通道 · 支持 WebP/PNG/JPEG 互转</p>
            </div>
            <a href="/image-converter/" class="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                使用批量图片转换压缩工具 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

def get_article_content_8():
    """高识别率二维码设计"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            很多运营人员或设计师在制作海报与名片时，为了美观，往往将二维码设计得色彩缤纷，甚至在中间放上尺寸很大的企业 Logo 头像。然而一旦打印出来或在暗光环境下，用户拿出手机微信或支付宝扫码时却频繁提示“未发现二维码”或久久无法识别。本文为您解密 <strong>二维码 Reed-Solomon 纠错容错算法与保障 100% 极速扫码识别的 4 大黄金设计铁律</strong>。
        </p>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-shield-halved text-indigo-500"></i> 二维码容错率 (Error Correction Level) 的四大等级
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div class="p-3.5 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div class="font-bold text-indigo-600 dark:text-indigo-400">L 级 (Low) - 约 7%</div>
                    <p class="text-zinc-500 text-xs">码点最稀疏。仅适用于纯纯文本、无中央 Logo、且只在屏幕干净显示的场景。</p>
                </div>
                <div class="p-3.5 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div class="font-bold text-indigo-600 dark:text-indigo-400">M 级 (Medium) - 约 15%</div>
                    <p class="text-zinc-500 text-xs">工业标准默认等级。平衡了码点密度与抗污损能力，适合绝大部分标准商品包装。</p>
                </div>
                <div class="p-3.5 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-1">
                    <div class="font-bold text-indigo-600 dark:text-indigo-400">Q 级 (Quartile) - 约 25%</div>
                    <p class="text-zinc-500 text-xs">较高容错。中心可遮挡较小面积的品牌小图标，具备较强的抗磨损能力。</p>
                </div>
                <div class="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1">
                    <div class="font-bold text-indigo-600 dark:text-indigo-400">H 级 (High) - 约 30% ⭐️</div>
                    <p class="text-zinc-600 dark:text-zinc-300 text-xs"><strong>艺术二维码必选！</strong> 即使中心被 Logo 遮挡近 1/3，仍可完整逆向解码出全部数据！</p>
                </div>
            </div>
        </section>

        <section class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <i class="fas fa-palette text-indigo-500"></i> 保障 100% 扫码识别的四大黄金设计铁律
            </h2>
            <ul class="space-y-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <strong>铁律一：前景色与背景色明暗反差必须大于 4:1</strong>。严禁浅灰底配浅蓝码、或黑底配暗紫码。推荐采用“纯白背景 + 深色点阵（深蓝、纯黑、深紫）”。
                </li>
                <li class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <strong>铁律二：严禁破坏周边的“三个定位回字角”</strong>。左上、右上和左下角是扫码头判断方向与视角的锚点，此处必须保持高对比度与完整性，切忌被装饰图遮挡。
                </li>
                <li class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <strong>铁律三：外围静区（Quiet Zone）必须留出至少 4 个模块宽度</strong>。二维码外圈不能紧贴着海报复杂的图文背景，必须有一圈干净的纯色留白，否则手机摄像头无法定位边界。
                </li>
                <li class="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                    <strong>铁律四：中心 Logo 尺寸控制在总面积 20% 以内</strong>。嵌入中央图标时，Logo 周围应加上一层白色细边框（Logo Margin），避免图标边缘颜色与二维码点阵黏连造成识别混淆。
                </li>
            </ul>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-qrcode text-indigo-500"></i> 现在就设计专业高识别率艺术二维码
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">支持自由定制点阵样式、容错等级、中心 Logo 与导出矢量 SVG</p>
            </div>
            <a href="/qr/" class="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                开启艺术二维码美化工具 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>
    </div>
    """

ARTICLE_CONTENT_MAP = {
    "id-photo-specifications": get_article_content_1,
    "id-photo-print-layout": get_article_content_2,
    "pdf-security-offline-extract": get_article_content_3,
    "pdf-merge-split-guide": get_article_content_4,
    "offline-ocr-technology-guide": get_article_content_5,
    "invoice-receipt-ocr-workflow": get_article_content_6,
    "webp-avif-image-formats-comparison": get_article_content_7,
    "high-recognition-qr-code-design": get_article_content_8
}

# -----------------------------------------------------------------------------
# 3. 生成 8 篇单独的落地文章 HTML
# -----------------------------------------------------------------------------

def build_single_article(art):
    slug = art["slug"]
    art_dir = os.path.join(GUIDES_DIR, slug)
    os.makedirs(art_dir, exist_ok=True)
    out_file = os.path.join(art_dir, "index.html")

    content_func = ARTICLE_CONTENT_MAP.get(slug)
    body_content = content_func() if content_func else "<p>内容准备中...</p>"

    # 推荐阅读列表（排除当前文章）
    related_arts = [a for a in ARTICLES if a["slug"] != slug][:3]
    related_html = ""
    for r in related_arts:
        related_html += f"""
        <a href="/guides/{r['slug']}/" class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800/80 transition-colors group flex flex-col justify-between">
            <div class="space-y-1.5">
                <span class="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{r['category']}</span>
                <h4 class="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    {r['title']}
                </h4>
            </div>
            <div class="pt-3 text-[11px] text-zinc-400 flex items-center justify-between">
                <span>{r['read_time']}</span>
                <i class="fas fa-arrow-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
            </div>
        </a>
        """

    html = f"""<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <title>{art['title']} - 超级工具箱 Pro 实用指南</title>
    <meta name="description" content="{art['description']}">
    <meta name="keywords" content="{art['keywords']}">
    <link rel="canonical" href="https://www.hhdzai.top/guides/{slug}/">

    <!-- Open Graph (SEO) -->
    <meta property="og:site_name" content="超级工具箱 Pro 实用指南">
    <meta property="og:title" content="{art['title']}">
    <meta property="og:description" content="{art['description']}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="https://www.hhdzai.top/guides/{slug}/">
    <meta property="og:image" content="https://www.hhdzai.top/icons/icon-512.png">

    <!-- Schema.org 结构化数据 (TechArticle) -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "{art['title']}",
      "description": "{art['description']}",
      "author": {{
        "@type": "Organization",
        "name": "超级工具箱 Pro 技术团队",
        "url": "https://www.hhdzai.top/"
      }},
      "publisher": {{
        "@type": "Organization",
        "name": "超级工具箱 Pro",
        "logo": {{
          "@type": "ImageObject",
          "url": "https://www.hhdzai.top/icons/icon-512.png"
        }}
      }},
      "datePublished": "{art['date']}",
      "dateModified": "{art['date']}",
      "mainEntityOfPage": "https://www.hhdzai.top/guides/{slug}/"
    }}
    </script>

{COMMON_HEAD}
</head>
<body class="bg-zinc-50 text-zinc-800 dark:bg-darkBg dark:text-zinc-200 min-h-screen font-sans flex flex-col transition-colors duration-200">

{COMMON_NAV}

    <!-- 顶部面包屑与文章标头 -->
    <main class="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8">
        
        <!-- 面包屑导航 -->
        <nav class="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <a href="/" class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">首页</a>
            <span>/</span>
            <a href="/guides/" class="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">实用指南</a>
            <span>/</span>
            <span class="text-zinc-800 dark:text-zinc-200 font-medium truncate max-w-xs">{art['category']}</span>
        </nav>

        <!-- 文章主体 Header -->
        <header class="space-y-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-{art['category_color']}-500/10 text-{art['category_color']}-600 dark:text-{art['category_color']}-400 border border-{art['category_color']}-500/20">
                <i class="fas {art['category_icon']}"></i>
                <span>{art['category']}</span>
            </div>
            
            <h1 class="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
                {art['title']}
            </h1>

            <div class="flex flex-wrap items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                <span class="flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-300">
                    <i class="fas fa-user-pen text-indigo-500"></i> 超级工具箱 Pro 技术团队
                </span>
                <span>•</span>
                <span class="flex items-center gap-1.5">
                    <i class="far fa-calendar"></i> {art['date']}
                </span>
                <span>•</span>
                <span class="flex items-center gap-1.5">
                    <i class="far fa-clock"></i> 预计阅读需 {art['read_time']}
                </span>
                <span>•</span>
                <span class="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <i class="fas fa-check-double"></i> 2026 官方标准核准
                </span>
            </div>
        </header>

        <!-- 文章详细内容 -->
        <article class="pt-2">
            {body_content}
        </article>

        <!-- 文章底部推荐阅读 -->
        <section class="pt-10 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <i class="fas fa-compass text-indigo-500"></i> 相关专题与实战指南推荐
                </h3>
                <a href="/guides/" class="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">查看全部指南 →</a>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {related_html}
            </div>
        </section>

    </main>

{COMMON_FOOTER}
</body>
</html>
"""
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[+] Wrote article: {out_file}")

# -----------------------------------------------------------------------------
# 4. 生成实用指南门户首页 guides/index.html
# -----------------------------------------------------------------------------

def build_guides_portal():
    portal_file = os.path.join(GUIDES_DIR, "index.html")

    cards_html = ""
    for art in ARTICLES:
        cards_html += f"""
        <article class="p-6 rounded-2xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 transition-all hover:shadow-lg flex flex-col justify-between group">
            <div class="space-y-3">
                <div class="flex items-center justify-between text-xs">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold bg-{art['category_color']}-500/10 text-{art['category_color']}-600 dark:text-{art['category_color']}-400 border border-{art['category_color']}-500/20">
                        <i class="fas {art['category_icon']}"></i> {art['category']}
                    </span>
                    <span class="text-zinc-400 dark:text-zinc-500 text-[11px]"><i class="far fa-clock"></i> {art['read_time']}</span>
                </div>
                
                <h2 class="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                    <a href="/guides/{art['slug']}/">{art['title']}</a>
                </h2>
                
                <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {art['description']}
                </p>
            </div>

            <div class="pt-5 mt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                <a href="/guides/{art['slug']}/" class="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                    阅读全文 <i class="fas fa-chevron-right text-[10px] group-hover:translate-x-1 transition-transform"></i>
                </a>
                <a href="{art['tool_url']}" class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 flex items-center gap-1 text-[11px]" title="直接体验工具">
                    <i class="fas fa-wrench"></i> {art['tool_name']}
                </a>
            </div>
        </article>
        """

    portal_html = f"""<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
    <title>实用指南与知识中心 - 超级工具箱 Pro (100% 本地隐私安全教程)</title>
    <meta name="description" content="超级工具箱 Pro 官方技术指南与知识库，包含最新标准证件照尺寸底色规范、6寸冲印排版技巧、离线 PDF 提取与安全合并、WebAssembly OCR 文字识别技术科普、WebP/AVIF 图片无损压缩与艺术二维码设计全攻略。">
    <meta name="keywords" content="超级工具箱指南, 证件照规范教程, 6寸相纸排版, 离线OCR原理, 免费PDF教程, 图片无损压缩指南, 艺术二维码设计教程">
    <link rel="canonical" href="https://www.hhdzai.top/guides/">

    <!-- Open Graph (SEO) -->
    <meta property="og:site_name" content="超级工具箱 Pro">
    <meta property="og:title" content="实用指南与知识中心 - 超级工具箱 Pro">
    <meta property="og:description" content="深入浅出的图文教程与技术白皮书，助您掌握图像处理、文档安全与离线高生产力工具。">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://www.hhdzai.top/guides/">
    <meta property="og:image" content="https://www.hhdzai.top/icons/icon-512.png">

    <!-- Schema.org 结构化数据 (CollectionPage) -->
    <script type="application/ld+json">
    {{
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": "超级工具箱 Pro 实用指南与知识中心",
      "description": "专业图像处理、离线安全与文档效率深度技术指南合集",
      "url": "https://www.hhdzai.top/guides/",
      "publisher": {{
        "@type": "Organization",
        "name": "超级工具箱 Pro",
        "logo": "https://www.hhdzai.top/icons/icon-512.png"
      }}
    }}
    </script>

{COMMON_HEAD}
</head>
<body class="bg-zinc-50 text-zinc-800 dark:bg-darkBg dark:text-zinc-200 min-h-screen font-sans flex flex-col transition-colors duration-200">

{COMMON_NAV}

    <!-- 顶部横幅 Banner -->
    <div class="w-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <i class="fas fa-book-open"></i> 超级工具箱 Pro 知识库
            </div>
            <h1 class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                实用实战指南与技术白皮书
            </h1>
            <p class="max-w-2xl mx-auto text-sm sm:text-base text-zinc-500 dark:text-zinc-400">
                探索现代 WebAssembly 纯本地离线计算的无限可能。汇聚标准证件照制作、合同 PDF 安全提取、现代图片格式选型与无损批量提效实操。
            </p>
        </div>
    </div>

    <!-- 核心文章列表网格 -->
    <main class="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">
        
        <!-- 统计与说明 -->
        <div class="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <i class="fas fa-layer-group text-indigo-500"></i> 精选深度实战指南（共 {len(ARTICLES)} 篇深度长文）
            </div>
            <div class="text-xs text-emerald-600 dark:text-emerald-400 font-medium hidden sm:flex items-center gap-1.5">
                <i class="fas fa-shield-check"></i> 纯原创 · 无虚构 · 官方标准校验
            </div>
        </div>

        <!-- 8 篇卡片网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards_html}
        </div>

        <!-- 底部呼吁体验 -->
        <div class="p-8 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-transparent border border-indigo-500/20 text-center space-y-4">
            <h3 class="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                想直接体验免登录、免上传的纯本地在线工具？
            </h3>
            <p class="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
                超级工具箱 Pro 提供包括 OCR 文字识别、智能证件照抠图、PDF 离线工具箱、批量格式压缩与艺术二维码在内的 6 大专业工具，100% 保护隐私。
            </p>
            <div class="pt-2">
                <a href="/" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md transition-all hover:scale-105">
                    立即开启超级工具箱 Pro <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    </main>

{COMMON_FOOTER}
</body>
</html>
"""
    with open(portal_file, "w", encoding="utf-8") as f:
        f.write(portal_html)
    print(f"[+] Wrote portal: {portal_file}")

# -----------------------------------------------------------------------------
# 5. 执行构建
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    print(f">> Starting site guides build...")
    build_guides_portal()
    for art in ARTICLES:
        build_single_article(art)
    print(f"[SUCCESS] Successfully created guides portal and {len(ARTICLES)} detailed articles!")
