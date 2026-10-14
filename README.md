# AI Chat 聚合窗口

> 一个把国内外主流 AI Chat 收进浏览器侧边栏的 Chrome 扩展（Manifest V3）。

在 Chrome 自带的**右侧边栏**里一站式切换 DeepSeek、Kimi、豆包、通义千问、腾讯元宝、文心一言、智谱清言、ChatGPT、Claude、Gemini、Grok、Perplexity、Copilot，随时随地开工，不用在十几个标签页之间来回找。

---

## ✨ 功能特性

- **侧边栏即用**：点击扩展图标，直接在当前窗口右侧边栏打开，不打断正在浏览的页面。
- **一键切换**：顶部下拉框在已启用的 AI Chat 之间快速切换。
- **内置 13 个主流站点**：国内外常用 AI Chat 开箱即用。
- **自定义列表**：支持添加、编辑、删除任意 AI Chat，网址自动补全 `https://` 并去重校验。
- **显示开关**：逐个控制某个 AI Chat 是否出现在切换列表中。
- **默认项设置**：指定每次打开时默认加载的 AI Chat（默认 DeepSeek）。
- **自定义请求头（User-Agent）**：可为单个站点指定 UA，点「手机」图标一键填入 Chrome 移动版 UA。
- **移动端伪装**：配合自定义 UA，将 `navigator` / `screen` 伪装成移动端，让依赖前端 JS 判断设备类型的站点切换到移动版布局。
- **内嵌增强**：自动移除目标站点的 `X-Frame-Options` / `CSP` 限制（仅对 iframe 生效，不影响正常标签页浏览）。
- **刷新 / 完整窗口打开**：一键重载当前页面，或用独立标签页打开以获得完整功能。

## 🚀 安装

本扩展未上架 Chrome 应用商店，请以「开发者模式」加载：

1. 下载或克隆本仓库到本地：
   ```bash
   git clone https://github.com/sunshgang/ai-chat-aggregator.git
   ```
2. 打开 Chrome，访问 `chrome://extensions/`。
3. 打开右上角的 **开发者模式**。
4. 点击 **加载已解压的扩展程序**，选择本仓库根目录（含 `manifest.json` 的那一层）。
5. 点击浏览器工具栏中的扩展图标，即可在右侧边栏打开。

> 需要 **Chrome 114+**（`chrome.sidePanel` API 要求）。

## 📖 使用

### 顶部栏

| 位置 | 元素 | 说明 |
| --- | --- | --- |
| 左侧 | 下拉框 | 选择并切换当前显示的 AI Chat |
| 右侧 | 刷新图标 | 完全重新加载当前页面 |
| 右侧 | 新窗口图标 | 在当前浏览器标签页中打开（获得完整功能） |
| 右侧 | 设置图标 | 进入设置页 |

### 设置页

- **默认打开的 AI Chat**：选择每次打开侧边栏时默认加载的站点。
- **AI Chat 列表**：每行右侧的开关控制是否在切换列表中显示；铅笔图标编辑，垃圾桶图标删除。
- **添加 AI Chat**：填写名称与网址即可；可选填自定义 `User-Agent`（点手机图标一键填入 Chrome 移动版 UA）。
- **恢复默认列表**：一键还原为内置的 13 个站点（会清除自定义修改）。

## 📱 关于移动端 UA

部分 AI Chat 的桌面版在窄侧边栏中排版不佳，切换为移动版往往体验更好。

本扩展提供两套机制协同工作：

1. **网络层**：通过 `chrome.declarativeNetRequest` 动态规则改写请求头 `User-Agent`，同时移除 `X-Frame-Options` / `CSP` 以便内嵌。
2. **客户端**：内容脚本 `cs-config.js`（隔离世界）读取配置，将 UA 写入 `<html data-aichat-ua="...">`；`cs-spoof.js`（主世界）据此伪装 `navigator.userAgent`、`navigator.userAgentData`、`navigator.platform`、`navigator.maxTouchPoints` 与 `screen.*`。

> 仅对**配置了自定义 UA**的站点生效，未配置的页面所有取值均回落到原生值，不影响正常浏览。

### 已知局限

- 若某站点完全依赖**服务器端 UA 嗅探**（而非前端 JS 判断），网络层改写可能被其拦截或忽略，需借助真实设备模拟（CDP）才能生效。
- 部分站点通过登录跳转或安全策略限制内嵌显示，此时请使用顶部栏的 **完整窗口打开** 按钮在新标签页使用。

## 🧱 项目结构

```
ai-chat-aggregator/
├── manifest.json      # 扩展清单（MV3）
├── background.js      # Service Worker：侧边栏行为 + 动态规则（UA / 移除防内嵌头）
├── defaults.js        # 内置 AI Chat 列表
├── cs-config.js       # 内容脚本（隔离世界）：读取配置并写入 DOM 属性
├── cs-spoof.js        # 内容脚本（主世界）：移动端 navigator / screen 伪装
├── sidepanel.html     # 侧边栏页面结构
├── sidepanel.css      # 侧边栏样式
├── sidepanel.js       # 侧边栏逻辑（切换、设置、增删改）
└── icons/             # 扩展图标
```

## 🛠 技术栈

- Chrome Extension **Manifest V3**
- `chrome.sidePanel`、`chrome.storage.local`、`chrome.declarativeNetRequest`
- 内容脚本双世界（`ISOLATED` / `MAIN`）通信
- 原生 JavaScript，无构建步骤，零依赖

## 🤝 贡献

本项目以个人自用为主，暂不接受外部提交。欢迎通过 Issue 反馈问题或建议。

## 📄 许可证

[MIT](LICENSE)
