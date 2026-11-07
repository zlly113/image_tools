import os
import sys
import zipfile
from datetime import datetime

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_ZIP = os.path.join(REPO_ROOT, f"image_tools_update_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip")

# 白名单目录与文件：严格只打包经过审计修复的生产资产
INCLUDE_PATHS = [
    # 前台核心
    "index.html",
    "image_tools.html",
    "about.html",
    "contact.html",
    "privacy.html",
    "terms.html",
    "404.html",
    "ads.txt",
    "6f7cc962b251481b98097d955460330c.txt",
    "llms.txt",
    "robots.txt",
    "sitemap.xml",
    "manifest.json",
    "sw.js",
    "opencv-esm-wrapper.js",
    
    # 独立落地页工具目录与指南库
    "bg-remover",
    "collage",
    "image-converter",
    "ocr",
    "pdf-tools",
    "qr",
    "guides",

    # 核心脚本与模块
    "js",
    "libs",
    "admin",
    "server",
    "locales",
    "icons",
    
    # 部署与依赖配置
    "nginx.conf.example",
    ".env.example",
    "requirements.txt",
    "create_admin.py",
    "UPDATE_GUIDE.md",
]

# 严格黑名单模式：匹配任何敏感、测试、本地数据与垃圾文件
EXCLUDE_PATTERNS = [
    "__pycache__",
    ".pytest_cache",
    ".git",
    ".scratch",
    "scratch",
    "tests",
    "data",          # 严禁打包数据库！生产环境必须保留既有数据库
    ".env",          # 严禁打包包含本地密钥的 .env
    ".zip",
    ".log",
    ".pyc"
]

def should_exclude(rel_path: str) -> bool:
    norm = rel_path.replace("\\", "/").lower()
    for pat in EXCLUDE_PATTERNS:
        # 匹配目录名或扩展名
        parts = norm.split("/")
        if pat in parts:
            return True
        if pat.startswith(".") and norm.endswith(pat):
            return True
    return False

def build_package():
    print(f">> Starting production release build...")
    print(f"   Target: {OUTPUT_ZIP}")
    
    file_count = 0
    total_size = 0
    
    with zipfile.ZipFile(OUTPUT_ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
        for item in INCLUDE_PATHS:
            full_path = os.path.join(REPO_ROOT, item)
            if not os.path.exists(full_path):
                print(f"[!] Warning: {item} does not exist, skipping.")
                continue
                
            if os.path.isfile(full_path):
                rel = os.path.relpath(full_path, REPO_ROOT)
                if not should_exclude(rel):
                    zipf.write(full_path, rel)
                    file_count += 1
                    total_size += os.path.getsize(full_path)
            elif os.path.isdir(full_path):
                for root, dirs, files in os.walk(full_path):
                    for f in files:
                        p = os.path.join(root, f)
                        rel = os.path.relpath(p, REPO_ROOT)
                        if not should_exclude(rel):
                            zipf.write(p, rel)
                            file_count += 1
                            total_size += os.path.getsize(p)

    zip_size = os.path.getsize(OUTPUT_ZIP)
    print(f"[SUCCESS] Production package successfully created!")
    print(f"   Files packed : {file_count}")
    print(f"   Unpacked size: {total_size / 1024 / 1024:.2f} MB")
    print(f"   Zip archive  : {zip_size / 1024 / 1024:.2f} MB")
    print(f"   Path         : {OUTPUT_ZIP}")
    return OUTPUT_ZIP

if __name__ == "__main__":
    build_package()
