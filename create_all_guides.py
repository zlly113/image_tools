# -*- coding: utf-8 -*-
"""
create_all_guides.py
自动生成超级工具箱 Pro 实用指南与知识中心 (/guides/)
包含 1 个指南门户导航页 + 8 篇深度 SEO 长文（每篇 1800~3000 字）
"""

import os

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
GUIDES_DIR = os.path.join(REPO_ROOT, "guides")
os.makedirs(GUIDES_DIR, exist_ok=True)

from generate_guides_content import COMMON_HEAD, COMMON_NAV, COMMON_FOOTER, ADSENSE_SCRIPT

# 8 篇深度指南元数据定义
ARTICLES = [
    {
        "slug": "id-photo-specifications",
        "title": "2026 最新标准证件照尺寸与背景底色规范全解析（一寸/二寸/考研/社保/教资）",
        "description": "详尽整理 2026 年最新常用证件照规范，包括一寸、二寸、小二寸、考研报名、教师资格证、计算机二级、社保卡及护照签证标准毫米与像素尺寸表，并提供红、白、蓝底色官方标准色号及纯本地离线一键换底色实操指南。",
        "keywords": "证件照尺寸对照表, 一寸证件照像素, 二寸证件照尺寸, 考研证件照要求, 教师资格证照片底色, 证件照红白蓝底色号, 在线换底色",
        "category": "图像处理与证件照",
        "category_icon": "fa-id-card",
        "category_color": "rose",
        "date": "2026-11-02",
        "read_time": "7 分钟",
        "tool_url": "/bg-remover/",
        "tool_name": "智能抠图换底色",
        "tool_cta": "立即免费制作标准证件照（纯本地处理，零上传防泄密）",
    },
    {
        "slug": "id-photo-print-layout",
        "title": "证件照排版冲印技巧：如何在 6 寸相纸上自动排版 8 张一寸照与 4 张二寸照？",
        "description": "告别照相馆几十元昂贵冲印！详细解析 6 寸相纸（152mm×102mm / 1800×1200 像素）排版公式与无损打印出血线技巧，通过超级工具箱 Pro 长图多图排版工具，纯本地零上传一键导出 300DPI 超清冲印版，线上冲印仅需几毛钱。",
        "keywords": "证件照排版, 6寸相纸排版一寸照, 证件照冲印模板, 手机自己排版证件照, 证件照打印排版, 300DPI证件照冲印",
        "category": "长图与拼接排版",
        "category_icon": "fa-layer-group",
        "category_color": "amber",
        "date": "2026-11-03",
        "read_time": "6 分钟",
        "tool_url": "/collage/",
        "tool_name": "长图拼接与照片排版",
        "tool_cta": "立即制作 6 寸冲印排版图（本地浏览器 300DPI 极速生成）",
    },
    {
        "slug": "pdf-security-offline-extract",
        "title": "商业机密与财务合同安全：为什么纯本地离线 PDF 文字提取比云端上传更安全？",
        "description": "探讨企业办公与财务管理中 PDF 文档的隐私风险。揭秘云端转换服务的数据沉淀、缓存嗅探与 AI 训练隐患，详解纯前端 WebAssembly 离线沙箱的安全原理，教你如何在拔掉网线的情况下 100% 本地提取多页 PDF 文字与表格。",
        "keywords": "离线PDF文字提取, 财务合同安全, 本地PDF识别, 公司机密防泄露, 涉密PDF处理, 本地浏览器OCR",
        "category": "文档安全与隐私",
        "category_icon": "fa-shield-halved",
        "category_color": "emerald",
        "date": "2026-11-03",
        "read_time": "8 分钟",
        "tool_url": "/ocr/",
        "tool_name": "离线 OCR 与 PDF 识别",
        "tool_cta": "体验纯本地离线 PDF 文字提取（断网亦可运行，绝对无上传）",
    },
    {
        "slug": "pdf-merge-split-guide",
        "title": "多页 PDF 批量合并、拆分与无损瘦身完整实操指南（无页数限制与无水印）",
        "description": "解决传统在线 PDF 工具收费、限制 5 页、强制添加水印的痛点。基于浏览器本地内存流式解析技术，手把手教你批量合并投标书合同、按页提取关键附件、精准删除冗余空白页并完成无损文档压缩。",
        "keywords": "PDF批量合并, PDF无损拆分, PDF页面提取, PDF本地压缩, 免费PDF工具箱无限制, PDF离线合并",
        "category": "PDF 工具指南",
        "category_icon": "fa-file-pdf",
        "category_color": "red",
        "date": "2026-11-04",
        "read_time": "6 分钟",
        "tool_url": "/pdf-tools/",
        "tool_name": "PDF 工具箱 Pro",
        "tool_cta": "立即免费合并或拆分 PDF（无页数限制，纯本地极速处理）",
    },
    {
        "slug": "offline-ocr-technology-guide",
        "title": "离线 OCR 文字识别技术深度科普：纯前端 WebAssembly 与 ONNX 引擎实测",
        "description": "深度解析浏览器端轻量级机器学习的发展史。揭秘 PaddleOCR 与 ONNX Runtime Web 如何通过 WebAssembly SIMD 指令集在客户端实现毫秒级多语言文本行检测与识别，对比云端 API 在安全性、速度与网络依赖维度的差异。",
        "keywords": "离线OCR原理, WebAssembly OCR, 浏览器本地文字识别, ONNX Runtime Web实测, PaddleOCR网页版, 本地AI模型",
        "category": "深度技术科普",
        "category_icon": "fa-microchip",
        "category_color": "indigo",
        "date": "2026-11-04",
        "read_time": "9 分钟",
        "tool_url": "/ocr/",
        "tool_name": "离线 OCR 识别",
        "tool_cta": "亲自检验本地 WebAssembly OCR 识别速度与准确率",
    },
    {
        "slug": "invoice-receipt-ocr-workflow",
        "title": "财务办公提效指南：发票、收据与表格图片文字的批量 OCR 识别与导出技巧",
        "description": "财务会计与人事行政必学的单据数字化工作流！针对折痕发票、模糊针式打印收据、倾斜拍照等痛点，提供图像预处理对比度调优方案，演示如何批量框选提取关键发票代码、金额税率与日期，并秒级复制进 Excel 表格。",
        "keywords": "发票批量OCR识别, 报销单文字提取, 表格图片转Excel, 离线发票识别软件, 财务发票数字化, 票据文字提取",
        "category": "办公提效实战",
        "category_icon": "fa-receipt",
        "category_color": "sky",
        "date": "2026-11-05",
        "read_time": "7 分钟",
        "tool_url": "/ocr/",
        "tool_name": "离线 OCR 识别",
        "tool_cta": "立即批量提取发票与单据文字（支持多页排版与导出）",
    },
    {
        "slug": "webp-avif-image-formats-comparison",
        "title": "WebP、AVIF 与 PNG、JPEG 深度横评：现代网站图片格式选型与批量无损压缩实战",
        "description": "全面对比现代 Web 图片格式的压缩算法、色彩深度、透明通道与兼容性表现。为什么 AVIF 能在同等画质下比 JPEG 减小 50% 体积？教你针对不同业务场景选用最佳格式，并通过本地批量工具一键实现无损极限压缩。",
        "keywords": "WebP转PNG, AVIF与WebP对比, 图片无损压缩, 网站首屏图片优化, 电商图片批量压缩, 现代图片格式选型",
        "category": "图像格式与压缩",
        "category_icon": "fa-arrows-rotate",
        "category_color": "purple",
        "date": "2026-11-05",
        "read_time": "8 分钟",
        "tool_url": "/image-converter/",
        "tool_name": "批量格式转换与压缩",
        "tool_cta": "立即批量压缩与转换图片（本地极限压榨体积，画质零损耗）",
    },
    {
        "slug": "high-recognition-qr-code-design",
        "title": "高识别率艺术二维码设计完全手册：容错率、颜色对比度与 Logo 嵌入规范",
        "description": "为什么很多设计精美的二维码扫不出来？深入解读 Reed-Solomon 纠错算法（L/M/Q/H 四级标准）。总结二维码点阵容差、中心 Logo 留白遮挡率、黑白底色反差比四大铁律，手把手制作高识别率、高颜值的品牌自适应二维码。",
        "keywords": "二维码生成, 艺术二维码制作技巧, 二维码容错率设置, 二维码Logo不识别原因, 二维码颜色对比度规范, 矢量SVG二维码",
        "category": "设计与二维码",
        "category_icon": "fa-qrcode",
        "category_color": "indigo",
        "date": "2026-11-06",
        "read_time": "7 分钟",
        "tool_url": "/qr/",
        "tool_name": "二维码生成与美化",
        "tool_cta": "立即免费设计高识别率艺术二维码（支持 SVG 矢量与中心 Logo）",
    }
]

print(f"[+] Loaded {len(ARTICLES)} article definitions.")
