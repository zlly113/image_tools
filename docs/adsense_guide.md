# 超级工具箱 Pro - Google AdSense 申请与接入实战指南

## 一、为什么现在必须先屏蔽所有广告？
根据 **Google AdSense 官方合作规范（AdSense Program Policies）**，在向 Google 提交新站审核时：
1. **严禁含有空白占位符或未加载的广告框**：页面如果留有空框会被判定为“缺少有价值的内容”或“模板/构建中网站”。
2. **严禁含有低质量的第三方弹窗或推广链接**：这会严重拉低审核员或 AI 审查时对站点原创度与合规性的评分。
3. **保持纯净与极速**：全站目前 100% 聚焦于工具功能、HowTo 指南与技术文档，展现极高的专业工具属性。

目前我们已经彻底关闭并隐匿了全站所有的广告位（HTML 设置强制隐藏，JS 逻辑静默拦截）。

---

## 二、Google AdSense 申请条件自检清单（全绿通过）

| 审核核心项 | 当前站点状况 | 达标评估 |
| :--- | :--- | :--- |
| **顶级独立域名与备案** | `https://www.hhdzai.top/`，国内工信部正式备案 (粤ICP备2026017857号) | ✅ 极高权重背书 |
| **全站 HTTPS 安全连接** | 全站强制 SSL 绿锁，Nginx 深度优化 | ✅ 达标 |
| **合规性必备法律页面** | 包含完整的关于我们 ([about.html](file:///d:/image_tools/about.html))、隐私政策 ([privacy.html](file:///d:/image_tools/privacy.html))、服务条款 ([terms.html](file:///d:/image_tools/terms.html))、联系方式 ([contact.html](file:///d:/image_tools/contact.html)) | ✅ 达标（AdSense 硬性要求） |
| **充足的高价值原创文本** | 6 大工具落地页均具备 1000 字以上的场景问答、操作步骤与技术原理，绝非空壳工具 | ✅ 达标 |
| **移动端适配与 Core Web Vitals** | 纯本地运行零后台延迟，PWA 移动端自适应，秒开体验 | ✅ 顶尖级别 |

---

## 三、Google AdSense 申请操作步骤（3~5天有收录后执行）

### 第 1 步：注册并提交网站
1. 访问 [Google AdSense 官网](https://adsense.google.com/) 并使用您的 Google 账号登录。
2. 点击 **「开始使用」**，输入您的网站网址：`https://www.hhdzai.top`。
3. 填写收款国家/地区（中国大陆或香港等，需与身份证信息一致）。
4. 接受条款并创建账号。

### 第 2 步：获取并插入 AdSense 验证代码
AdSense 会给您一段专属的客户端全局代码，格式如下：
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
     crossorigin="anonymous"></script>
```
届时告诉我您的 `ca-pub-XXXXXXXXXXXXXXXX` 客户端 ID，我将为您一键注入到 `index.html` 以及各个落地页的 `<head>` 中，并重新打包部署。

### 第 3 步：在 AdSense 后台点击“申请审核”
在 AdSense 后台勾选“我已放置代码”，点击 **「请求审核」**。
Google 审核通常需要 24 小时至 3~7 天，通过后会收到祝贺邮件。

---

## 四、审核通过后的广告布局推荐（高收益且不打扰用户）

1. **自动广告（Auto Ads，强烈推荐首选）**：
   * 在 AdSense 后台开启“自动广告”，Google 的 AI 算法会自动分析页面结构，只在页面留白充裕、不遮挡主要操作按钮的位置智能插入广告。
2. **预留精准广告位（已在代码中就绪）**：
   * **位置 A：侧边栏底部** (`sidebar-ad`)：在左侧工具切换栏下方，适合展示 300x250 矩形广告。
   * **位置 B：主要操作台上方** (`top-banner`)：适合展示 728x90 横幅自适应广告。
   * **位置 C：工具正文底部/说明上方** (`in-content-ad`)：用户处理完图片往下滑动导出时展现，转化率最高。
