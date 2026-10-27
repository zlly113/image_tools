# 生产环境安全与功能升级指南 (2026-10-27)

本指南指导如何将代码审计修复（包括全部 8 项 P0 严重漏洞及关键 P1 缺陷）安全部署至线上生产环境。

---

## 升级包信息
- **升级包文件名**：`image_tools_update_20261027_215546.zip`
- **主要内容**：
  - 前端全套静态资源（含修复后的 XSS 防护、CVE-2024-4367 缓解、PDF 内存回收、二维码防崩等）
  - 后端 Python 代码（含 IP 伪造防御、并发防超扣、Token 轮换、72 字节超长密码防碰撞等）
  - 管理后台前端资源（含并发防重复提交、退出登录即时销毁 Token 等）
  - 生产配置模板：`nginx.conf.example`、`create_admin.py`、`requirements.txt`

> **安全保障**：本升级包已严格过滤，**绝不包含** `.env` 环境变量文件、本地测试数据库文件（`data/*.db`）及 Git 历史，直接解压覆盖不会覆盖您的线上数据与生产密钥。

---

## 步骤一：升级前备份（必须执行）

在进行任何文件覆盖前，请先在服务器上备份重要数据与环境配置：

```bash
# 假设线上项目目录为 /var/www/image_tools（请替换为您的实际路径）
cd /var/www/image_tools

# 1. 备份线上 .env
cp .env .env.backup_$(date +%Y%m%d)

# 2. 备份线上 SQLite 数据库（如使用 SQLite）
cp -r data/ data_backup_$(date +%Y%m%d)/
```

---

## 步骤二：解压升级包覆盖文件

将升级包 `image_tools_update_20261027_215546.zip` 上传至服务器项目根目录并解压覆盖：

```bash
# 解压并覆盖文件
unzip -o image_tools_update_20261027_215546.zip -d /var/www/image_tools/
```

---

## 步骤三：更新 Python 依赖

进入 Python 运行环境（如激活了 virtualenv / conda）：

```bash
pip install -r requirements.txt
```

---

## 步骤四：检查与更新生产 `.env` 配置

审计修复中增强了配置安全检查。如果 `ENVIRONMENT=production`，系统会**拒绝**弱口令与默认占位符。请检查线上 `.env`：

1. **JWT 密钥**：
   确保 `SECRET_KEY` 已经修改为随机的高强度字符串（勿使用 `your-production-secret-key-change-this-min-32-chars` 或空值）。
2. **Setup Admin 接口策略（重要）**：
   - 漏洞 P0-2 修复后，网页端的 `/setup-admin` 接口默认**完全禁用**。
   - **推荐的管理账号创建方式**：直接在服务器命令行执行：
     ```bash
     python create_admin.py
     ```
     交互式输入管理员用户名与密码即可。
   - 若确实需要临时允许从接口初始化管理员，可在 `.env` 中设置 `SETUP_ADMIN_TOKEN=一段高强度的随机密钥`，请求时在 Header 中附带 `X-Setup-Token`，初始化完成后务必从 `.env` 移除该配置。

---

## 步骤五：更新 Nginx 配置（防文件泄漏与安全加固）

参考项目中最新更新的 `nginx.conf.example`，在服务器 Nginx 站点的 `server` 块中确保包含以下规则：

### 1. 绝对禁止访问敏感文件与后端目录
```nginx
# 1. 禁止访问隐藏文件（.env、.git 等）
location ~ /\. {
    deny all;
    return 404;
}

# 2. 禁止访问数据库目录
location ^~ /data/ {
    deny all;
    return 404;
}

# 3. 禁止直接访问后端代码目录与草稿临时目录
location ^~ /server/ {
    deny all;
    return 404;
}
location ^~ /.scratch/ {
    deny all;
    return 404;
}

# 4. 禁止直接访问敏感文件扩展名
location ~* \.(env|db|sqlite|sqlite3|py|sh|log|bak|sql|md)$ {
    deny all;
    return 404;
}
```

### 2. 管理后台尾斜杠规范化
```nginx
# 避免丢失尾斜杠导致静态相对路径（js/adminApp.js）寻址失败
location = /admin {
    return 301 /admin/;
}
```

### 3. API 与短链转发
```nginx
# 真实 IP 头传递（配合后端的安全 IP 获取防伪造）
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 免费短网址重定向
location ^~ /s/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

测试并重载 Nginx：
```bash
nginx -t && nginx -s reload
```

---

## 步骤六：重启后端服务

根据您服务器使用的进程管理工具重启后端，例如：

- **Systemd**：
  ```bash
  sudo systemctl restart image_tools
  ```
- **Supervisor**：
  ```bash
  supervisorctl restart image_tools
  ```
- **PM2**：
  ```bash
  pm2 restart image_tools
  ```

---

## 步骤七：验证与验收检查清单

升级完成后，请进行以下 4 项简单验证：

1. **敏感文件防泄漏验证**：
   - 访问 `https://您的域名/.env` -> 必须返回 `404` 或 `403`。
   - 访问 `https://您的域名/data/toolbox.db` -> 必须返回 `404` 或 `403`。
   - 访问 `https://您的域名/server/main.py` -> 必须返回 `404` 或 `403`。
2. **管理后台验证**：
   - 访问 `https://您的域名/admin/` -> 页面正常加载，登录功能正常。
3. **前端工具验证**：
   - 访问主页，测试 PDF 合并/拆分、图片 OCR、二维码生成与短链接工具，确保功能全部正常。
4. **客户端缓存刷新**：
   - 由于更新了 Service Worker (`sw.js`)，用户浏览器在下一次访问时会自动静默更新至最新 v3.3 缓存。
