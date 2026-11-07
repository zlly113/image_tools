#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
indexnow_push.py - 微软 Bing & Yandex IndexNow 极速索引提交工具
通过官方 IndexNow API 批量推送本地 sitemap.xml 中的所有 URL，
实现搜索引擎分钟级抓取与收录。
"""

import os
import sys
import json
import urllib.request
import xml.etree.ElementTree as ET

HOST = "www.hhdzai.top"
INDEXNOW_KEY = "6f7cc962b251481b98097d955460330c"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"

def get_urls_from_sitemap(sitemap_path):
    if not os.path.exists(sitemap_path):
        print(f"[!] 找不到 sitemap 文件: {sitemap_path}")
        return []
    
    tree = ET.parse(sitemap_path)
    root = tree.getroot()
    namespaces = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
    
    urls = []
    for loc in root.findall('.//ns:loc', namespaces):
        if loc.text:
            urls.append(loc.text.strip())
            
    if not urls:
        for loc in root.iter('loc'):
            if loc.text:
                urls.append(loc.text.strip())
                
    return sorted(list(set(urls)))

def push_to_indexnow(urls):
    api_url = "https://api.indexnow.org/indexnow"
    payload = {
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls
    }
    
    data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    req = urllib.request.Request(
        api_url,
        data=data,
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "User-Agent": "Mozilla/5.0 IndexNow-Client"
        }
    )
    
    print(f"[*] 正在向 IndexNow (Bing & Yandex) 推送 {len(urls)} 个核心 URL...")
    for idx, u in enumerate(urls, 1):
        print(f"    {idx}. {u}")
        
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            code = resp.status
            print(f"\n[+] IndexNow 响应成功！HTTP 状态码: {code}")
            if code in [200, 202]:
                print("    Bing 与 IndexNow 联盟已成功接收并进入分钟级优先抓取队列！")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        print(f"\n[-] IndexNow 接口返回状态: HTTP {e.code}: {body}")
        if e.code == 202:
            print("    (HTTP 202 表示请求已接受待处理，属于成功状态)")
            return True
        elif e.code == 422:
            print("    (HTTP 422: 请确保已将密钥文件部署到线上根目录)")
        return False
    except Exception as e:
        print(f"\n[-] 请求异常: {e}")
        return False

def main():
    repo_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sitemap_file = os.path.join(repo_root, "sitemap.xml")
    if not os.path.exists(sitemap_file):
        sitemap_file = "sitemap.xml"
        
    urls = get_urls_from_sitemap(sitemap_file)
    if not urls:
        print("[!] 未找到任何待推送 URL。")
        sys.exit(1)
        
    push_to_indexnow(urls)

if __name__ == "__main__":
    main()
