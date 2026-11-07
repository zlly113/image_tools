#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
baidu_push.py - 百度站长平台 API 主动推送工具
功能：自动解析本地 sitemap.xml 中的所有网页链接，调用百度官方普通收录 API 进行极速推送。
使用方法：
    python baidu_push.py --token 你的百度站长Token
或者直接在脚本中修改 BAIDU_TOKEN 变量后执行：
    python baidu_push.py
"""

import sys
import os
import argparse
import urllib.request
import json
import xml.etree.ElementTree as ET

# 默认站点信息 (可在此直接填入你在百度搜索资源平台获取的准入密钥 token)
SITE_DOMAIN = "https://www.hhdzai.top"
DEFAULT_TOKEN = "d3pXP0CZ4e6kHSZQ"

def get_urls_from_sitemap(sitemap_path):
    if not os.path.exists(sitemap_path):
        print(f"[!] 找不到 sitemap 文件: {sitemap_path}")
        return []
    
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    # 处理 xml 命名空间
    namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    
    urls = []
    for loc in root.findall('.//ns:loc', namespaces):
        if loc.text:
            urls.append(loc.text.strip())
            
    # 如果没匹配到带命名空间的，尝试直接查找 loc
    if not urls:
        for loc in root.iter('loc'):
            if loc.text:
                urls.append(loc.text.strip())
                
    return sorted(list(set(urls)))

def push_to_baidu(urls, site, token):
    if token == "YOUR_BAIDU_TOKEN_HERE" or not token:
        print("[!] 错误：请提供有效的百度站长平台 Token。")
        print("    获取路径：登录 https://ziyuan.baidu.com/ -> 普通收录 -> 资源提交 -> API提交 -> 接口调用地址中的 token=xxx 参数。")
        return False
        
    api_url = f"http://data.zz.baidu.com/urls?site={site}&token={token}"
    data_payload = "\n".join(urls).encode('utf-8')
    
    print(f"[*] 正在向百度推送 {len(urls)} 个核心 URL...")
    for idx, u in enumerate(urls, 1):
        print(f"    {idx}. {u}")
        
    req = urllib.request.Request(
        api_url,
        data=data_payload,
        headers={'Content-Type': 'text/plain'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode('utf-8')
            res = json.loads(body)
            print("\n[+] 百度接口响应成功：")
            print(f"    成功推送条数: {res.get('success', 0)}")
            print(f"    当天剩余可用额度: {res.get('remain', 0)}")
            if 'not_same_site' in res:
                print(f"    非本站 URL: {res['not_same_site']}")
            if 'not_valid' in res:
                print(f"    不合规 URL: {res['not_valid']}")
            return True
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        print(f"\n[-] 百度接口报错 (HTTP {e.code}): {err_msg}")
        return False
    except Exception as e:
        print(f"\n[-] 网络请求异常: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="百度站长 API 主动推送工具")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="百度站长普通收录 token")
    parser.add_argument("--site", default=SITE_DOMAIN, help="站点域名 (如 https://www.hhdzai.top)")
    parser.add_argument("--sitemap", default="sitemap.xml", help="sitemap.xml 路径")
    parser.add_argument("--limit", type=int, default=10, help="单次推送条数限制 (针对新站配额，默认10条)")
    parser.add_argument("--offset", type=int, default=0, help="推送链接起始偏移量")
    args = parser.parse_args()
    
    # 优先在工作目录寻找 sitemap.xml
    sitemap_file = args.sitemap
    if not os.path.exists(sitemap_file):
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sitemap_file = os.path.join(base_dir, "sitemap.xml")
        
    urls = get_urls_from_sitemap(sitemap_file)
    if not urls:
        print("[!] 未在 sitemap.xml 中读取到任何 URL，终止推送。")
        sys.exit(1)
        
    print(f"[*] 从 {sitemap_file} 成功提取 {len(urls)} 个待推送链接。")
    to_push = urls[args.offset : args.offset + args.limit] if args.limit > 0 else urls
    print(f"[*] 准备推送第 {args.offset + 1} 至 {args.offset + len(to_push)} 条链接 (共 {len(to_push)} 条)...")
    push_to_baidu(to_push, args.site, args.token)

if __name__ == "__main__":
    main()
