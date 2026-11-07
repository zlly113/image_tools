# -*- coding: utf-8 -*-
"""
build_guides_portal_and_articles.py
完整生成 guides/index.html 及 8 篇高价值深度图文教程
"""

import os
from create_all_guides import ARTICLES, COMMON_HEAD, COMMON_NAV, COMMON_FOOTER, ADSENSE_SCRIPT

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
GUIDES_DIR = os.path.join(REPO_ROOT, "guides")

# -----------------------------------------------------------------------------
# 1. 文章内容生成器字典
# -----------------------------------------------------------------------------

def get_article_content_1():
    """证件照规范"""
    return """
    <div class="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm sm:text-base">
        <p class="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 font-medium">
            在日常生活、考研报名、各类职业资格考试以及护照签证办理过程中，证件照往往是政务系统审核的“第一道门槛”。许多人因背景色偏色、像素不足或尺寸比例不符，遭到系统驳回甚至错失报名时间。本文系统整理 <strong>2026 年最新国家标准证件照规格、官方底色色号参数及避坑指南</strong>，助您快速制作出合格的合规证件照。
        </p>

        <!-- 目录导读 -->
        <div class="p-5 rounded-2xl bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60">
            <h3 class="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center gap-2">
                <i class="fas fa-list-ul text-rose-500"></i> 本文目录导读
            </h3>
            <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                <li><a href="#section-1" class="hover:text-rose-500 transition-colors">一、通用标准证件照尺寸对照表 (mm / px)</a></li>
                <li><a href="#section-2" class="hover:text-rose-500 transition-colors">二、2026 特殊升学与考试类证件照硬性规范</a></li>
                <li><a href="#section-3" class="hover:text-rose-500 transition-colors">三、红、白、蓝官方标准底色 Hex 色号参数</a></li>
                <li><a href="#section-4" class="hover:text-rose-500 transition-colors">四、证件照拍摄 5 大禁忌与细节要求</a></li>
                <li><a href="#section-5" class="hover:text-rose-500 transition-colors">五、纯本地免上传 10 秒一键换底色实操教程</a></li>
                <li><a href="#section-faq" class="hover:text-rose-500 transition-colors">六、高频常见问题解答 (FAQ)</a></li>
            </ul>
        </div>

        <!-- 第一节 -->
        <section id="section-1" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">1</span>
                通用标准证件照尺寸对照表（冲印与线上标准）
            </h2>
            <p>
                在数码照相时代，证件照通常有两种量化指标：<strong>毫米尺寸（用于物理相纸冲印）</strong> 与 <strong>像素尺寸（用于网上申报系统，按 300 DPI 印刷标准计算）</strong>。
            </p>
            <div class="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                <table class="w-full text-left text-xs sm:text-sm">
                    <thead class="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold">
                        <tr>
                            <th class="p-3.5">规格名称</th>
                            <th class="p-3.5">物理尺寸 (宽×高 mm)</th>
                            <th class="p-3.5">300 DPI 标准像素</th>
                            <th class="p-3.5">常用背景底色</th>
                            <th class="p-3.5">主要应用场景</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-600 dark:text-zinc-300">
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">标准一寸 (小一寸)</td>
                            <td class="p-3.5">25mm × 35mm</td>
                            <td class="p-3.5">295px × 413px</td>
                            <td class="p-3.5">红 / 白 / 蓝</td>
                            <td class="p-3.5">学生证、驾照、简历、体检表、部分职业资格认证</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">大一寸 (彩色)</td>
                            <td class="p-3.5">33mm × 48mm</td>
                            <td class="p-3.5">390px × 567px</td>
                            <td class="p-3.5">白色 / 浅蓝</td>
                            <td class="p-3.5">中国护照、港澳通行证、各类涉外签证</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">小二寸 (国考标配)</td>
                            <td class="p-3.5">33mm × 45mm</td>
                            <td class="p-3.5">390px × 531px</td>
                            <td class="p-3.5">白色 / 蓝色</td>
                            <td class="p-3.5">普通护照、部分国家签证、公务员国考体检</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">标准二寸</td>
                            <td class="p-3.5">35mm × 53mm</td>
                            <td class="p-3.5">413px × 626px</td>
                            <td class="p-3.5">红 / 白 / 蓝</td>
                            <td class="p-3.5">毕业证书、学位证、职业资格等级证书、出国签证</td>
                        </tr>
                        <tr class="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                            <td class="p-3.5 font-bold text-zinc-900 dark:text-zinc-100">二代居民身份证</td>
                            <td class="p-3.5">26mm × 32mm</td>
                            <td class="p-3.5">358px × 441px</td>
                            <td class="p-3.5">纯白无边框</td>
                            <td class="p-3.5">中国第二代居民身份证数字相片规范</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </section>

        <!-- 第二节 -->
        <section id="section-2" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">2</span>
                2026 特殊升学与考试类证件照硬性规范
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                        <i class="fas fa-graduation-cap text-indigo-500"></i> 全国硕士研究生招生考试 (研招网)
                    </h4>
                    <ul class="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <li>• <strong>背景要求</strong>：纯白色背景（不得有反光阴影）。</li>
                        <li>• <strong>像素尺寸</strong>：宽 480 像素 × 高 640 像素（比例 3:4）。</li>
                        <li>• <strong>文件格式</strong>：JPG / JPEG，文件体积在 20KB ~ 200KB 之间。</li>
                        <li>• <strong>头部比例</strong>：头部宽度约占画面 1/2，头顶上方留白不少于整体高度 1/10。</li>
                    </ul>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                        <i class="fas fa-chalkboard-user text-emerald-500"></i> 中小学教师资格考试 (NTCE)
                    </h4>
                    <ul class="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <li>• <strong>背景要求</strong>：纯白色，六个月内近照。</li>
                        <li>• <strong>像素尺寸</strong>：宽 150 像素 × 高 200 像素，分辨率不低于 300 DPI。</li>
                        <li>• <strong>文件体积</strong>：小于 200KB，不得翻拍纸质照片，严禁美颜变形。</li>
                        <li>• <strong>着装要求</strong>：穿深色正装或有领便装，严禁穿纯白色衣服。</li>
                    </ul>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                        <i class="fas fa-id-badge text-sky-500"></i> 电子社会保障卡 / 医保凭证
                    </h4>
                    <ul class="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <li>• <strong>背景要求</strong>：纯白色或浅蓝色。</li>
                        <li>• <strong>像素尺寸</strong>：358px × 441px（或标准一寸 295px × 413px）。</li>
                        <li>• <strong>光照要求</strong>：脸部光线均匀，无红眼、无镜片反光。</li>
                    </ul>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 space-y-2">
                    <h4 class="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                        <i class="fas fa-car text-amber-500"></i> 机动车驾驶证数字照片
                    </h4>
                    <ul class="text-xs space-y-1.5 text-zinc-600 dark:text-zinc-400">
                        <li>• <strong>物理尺寸</strong>：32mm × 22mm，纯白色背景。</li>
                        <li>• <strong>人像特征</strong>：矫正视力者需佩戴不反光平光眼镜，神态自然，露双耳。</li>
                        <li>• <strong>防伪要求</strong>：不得添加边框或艺术文字。</li>
                    </ul>
                </div>
            </div>
        </section>

        <!-- 第三节 -->
        <section id="section-3" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">3</span>
                红、白、蓝官方标准底色 Hex 色号与 RGB 参数
            </h2>
            <p>
                在 PS 或在线工具更换背景时，切忌随意抓取花哨的亮蓝或刺眼大红，否则在国家级政务平台可能被判定为“色彩饱和度超标”。以下为国家官方标准色系：
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-[#FFFFFF] border-2 border-zinc-300 dark:border-zinc-600 shrink-0 shadow-inner"></div>
                    <div class="space-y-0.5">
                        <div class="font-bold text-sm text-zinc-900 dark:text-zinc-100">纯白底色 (White)</div>
                        <div class="text-xs text-zinc-500 font-mono">HEX: #FFFFFF</div>
                        <div class="text-xs text-zinc-400">RGB: (255, 255, 255)</div>
                        <div class="text-[11px] text-zinc-500">身份证/护照/教资/考研</div>
                    </div>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-[#438EDB] shrink-0 shadow-xs"></div>
                    <div class="space-y-0.5">
                        <div class="font-bold text-sm text-zinc-900 dark:text-zinc-100">标准蓝底 (Blue)</div>
                        <div class="text-xs text-zinc-500 font-mono">HEX: #438EDB</div>
                        <div class="text-xs text-zinc-400">RGB: (67, 142, 219)</div>
                        <div class="text-[11px] text-zinc-500">社保/毕业证/计算机考试</div>
                    </div>
                </div>
                <div class="p-4 rounded-xl bg-white dark:bg-darkCard border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
                    <div class="w-12 h-12 rounded-lg bg-[#C40000] shrink-0 shadow-xs"></div>
                    <div class="space-y-0.5">
                        <div class="font-bold text-sm text-zinc-900 dark:text-zinc-100">标准红底 (Red)</div>
                        <div class="text-xs text-zinc-500 font-mono">HEX: #C40000</div>
                        <div class="text-xs text-zinc-400">RGB: (196, 0, 0)</div>
                        <div class="text-[11px] text-zinc-500">结婚登记/党团资料/入职档案</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- 第四节 -->
        <section id="section-4" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">4</span>
                证件照自拍与拍摄 5 大禁忌
            </h2>
            <div class="space-y-3">
                <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                    <div><strong>禁忌一：穿与背景同色的衣服。</strong> 如果需要白底证件照，严禁穿纯白T恤或白色衬衫，会导致肩颈边缘与背景融为一体，抠图算法也无法精准保留轮廓。推荐穿深蓝、藏青或黑色有领衣服。</div>
                </div>
                <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                    <div><strong>禁忌二：侧光导致“阴阳脸”。</strong> 手机自拍时尽量正对光源（如白天明亮的窗户前方），切忌斜侧光照造成半张脸深暗阴影，政务系统人脸比对时极易报错。</div>
                </div>
                <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                    <div><strong>禁忌三：刘海遮挡眉毛与双耳。</strong> 证件照以生物面部特征识别为主，务必梳理好刘海露出完整眉毛、双眼与双耳轮廓，不得佩戴夸张耳环、头饰。</div>
                </div>
                <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                    <div><strong>禁忌四：深度美颜磨皮导致人脸特征丢失。</strong> 磨皮过度抹去鼻梁轮廓或嘴角弧度会被人脸识别系统判定为“非本人照片”，导致现场核验无法入场。</div>
                </div>
                <div class="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs sm:text-sm text-red-900 dark:text-red-300 flex items-start gap-3">
                    <i class="fas fa-triangle-exclamation text-red-500 mt-0.5 shrink-0"></i>
                    <div><strong>禁忌五：仰拍或俯拍导致透视畸变。</strong> 手机镜头应保持与眼睛水平齐平，距离面部约 1.5 米~ 2 米，避免手机贴脸过近造成“大鼻子小脸”的广角透视畸变。</div>
                </div>
            </div>
        </section>

        <!-- 第五节：实操 -->
        <section id="section-5" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">5</span>
                纯本地免上传 10 秒一键换底色实操教程
            </h2>
            <p>
                使用传统在线抠图网站，个人私密照片会被上传到第三方服务器上，存在隐私泄露风险。超级工具箱 Pro 采用纯前端浏览器离线运算，全过程<strong>零网络请求、绝对隐私安全</strong>。
            </p>
            <div class="space-y-3">
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs shrink-0">1</span>
                    <div><strong>上传原始照片</strong>：打开 <a href="/bg-remover/" class="text-rose-500 font-semibold underline">智能证件照换底色工具</a>，将手机拍摄的半身正视照片拖入编辑区。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs shrink-0">2</span>
                    <div><strong>AI 自动高精度抠图</strong>：本地 WebAssembly 视觉算法将在 1 秒内精确分离发丝与背景，自动生成无损透明 PNG 图层。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs shrink-0">3</span>
                    <div><strong>一键替换标准底色</strong>：在色板中直接点击预设的<strong>“纯白”、“标准蓝”或“红底”</strong>，工具会自动完成羽化与边缘边缘光补偿。</div>
                </div>
                <div class="flex items-start gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs sm:text-sm">
                    <span class="w-6 h-6 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs shrink-0">4</span>
                    <div><strong>无损下载高清成品</strong>：点击“导出照片”，支持即时下载符合规格的无水印高清照片，亦可配合 <a href="/collage/" class="text-rose-500 font-semibold underline">长图多图排版</a> 排版为 6 寸打印版。</div>
                </div>
            </div>
        </section>

        <!-- CTA 卡片 -->
        <div class="my-8 p-6 rounded-2xl bg-gradient-to-r from-rose-500/10 via-indigo-500/10 to-transparent border border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="space-y-1 text-center sm:text-left">
                <div class="font-bold text-base text-zinc-900 dark:text-zinc-100 flex items-center gap-2 justify-center sm:justify-start">
                    <i class="fas fa-wand-magic-sparkles text-rose-500"></i> 现在就尝试制作您的标准证件照
                </div>
                <p class="text-xs text-zinc-500 dark:text-zinc-400">100% 浏览器本地运行 · 绝不上云 · 极速免费秒级导出</p>
            </div>
            <a href="/bg-remover/" class="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md hover:scale-105 transition-all shrink-0">
                免费使用证件照换底色工具 <i class="fas fa-arrow-right ml-1"></i>
            </a>
        </div>

        <!-- FAQ -->
        <section id="section-faq" class="space-y-4">
            <h2 class="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <span class="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center text-sm font-bold">?</span>
                常见问题解答 (FAQ)
            </h2>
            <div class="space-y-3">
                <details class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 group" open>
                    <summary class="font-semibold text-sm cursor-pointer list-none flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                        <span>问：上传报名系统提示“照片文件太大（超过200KB）”怎么处理？</span>
                        <i class="fas fa-chevron-down text-zinc-400 group-open:rotate-180 transition-transform text-xs"></i>
                    </summary>
                    <p class="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-normal">
                        答：可以直接使用超级工具箱 Pro 的 <a href="/image-converter/" class="text-rose-500 font-semibold underline">批量图片压缩工具</a>，将压缩质量设定在 80%~85%，无需改变像素分辨率即可无损将 1MB~3MB 的高清照片平滑压缩到 50KB~150KB 达标区间。
                    </p>
                </details>
                <details class="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 group">
                    <summary class="font-semibold text-sm cursor-pointer list-none flex items-center justify-between text-zinc-900 dark:text-zinc-100">
                        <span>问：更换底色后头发边缘出现白边或红边杂色怎么办？</span>
                        <i class="fas fa-chevron-down text-zinc-400 group-open:rotate-180 transition-transform text-xs"></i>
                    </summary>
                    <p class="mt-2 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-normal">
                        答：这通常是因为原图拍摄时背景杂乱，或者原背景颜色反光渗入发丝。建议在原始拍摄时尽量靠在一面干净的素色墙壁前，并在换底工具中微调“边缘羽化阈值（Feathering）”，可消除边缘残余底色。
                    </p>
                </details>
            </div>
        </section>
    </div>
    """

print("[+] Content generator functions ready.")
