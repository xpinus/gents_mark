# 🎩 Gents' Mark

> *The discreet bookmark companion for gentlemen.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Edge Add-on](https://img.shields.io/badge/Microsoft_Edge-Add--on-0078D7?logo=microsoft-edge)](https://microsoftedge.microsoft.com/)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

**Gents' Mark** 是一款为 Microsoft Edge 打造的绅士书签加密扩展。它将你珍藏的数字印记妥善保管，让每一次浏览都保持优雅与从容。

> 当前状态：核心功能已实现，构建产物位于 `dist/`，可在 Edge 中加载为解压扩展进行体验。

> ⚠️ **重要提醒**：卸载扩展会清除本地所有金库数据，导致书签永久丢失。请在卸载前**导出备份文件**或**点击同步按钮**将金库同步到云端。重装后可通过导入备份或自动从云端恢复。

## ✨ 核心特质

- **🔐 私密金库 (The Vault)**：采用 AES-256-GCM 加密算法，将你的私密书签牢牢锁在本地。钥匙，只在你手中。
- **🕵️ 隐形书签**：锁入金库的书签将从 Edge 原生收藏夹中消失，彻底隐身，旁人无从察觉。
- **📦 纯净本地**：所有数据默认仅存储于你的本地浏览器中；可选同步模式也只同步加密密文（保存在edge账户的chrome.storage.sync中），你的珍藏只属于你自己。
- **🌐 中英双语**：完整支持中文（简体）和英文界面，跟随浏览器语言自动切换。

## 🚀 快速上手

1. 从 Edge 扩展商店安装 [Gents' Mark](
https://microsoftedge.microsoft.com/addons/detail/daibgdliohaajphcjpkckglmhmnompgm)。
2. 点击浏览器工具栏中的 🎩 图标，设置你的**主密码**（请务必牢记，密码无法找回）。
3. 打开扩展面板，在 **书签选择器** 中勾选想要保护的文件夹或书签，点击 **"移入金库"**；也可以在网页上右键选择 **"将当前页面锁入金库"**。
4. 需要查看时，点击 🎩 图标，输入密码即可浏览你的珍藏。

## 🛠️ 技术实现

- **加密标准**：[Web Cryptography API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) + AES-256-GCM
- **密钥派生**：PBKDF2-SHA256（密钥派生 600,000 次迭代，密码校验 1,000,000 次），双盐设计
- **会话管理**：AES-KW 密钥包装，解锁密钥存入 `chrome.storage.session`（内存态，浏览器重启即清空）
- **自动锁定**：5 分钟无操作自动清空会话密钥，监听鼠标/键盘/焦点事件刷新计时
- **存储方式**：默认 `chrome.storage.local`（数据仅存本地）；可选 `chrome.storage.sync` 同步加密快照
- **备份恢复**：加密 JSON 文件导出/导入，导入时验证密码
- **权限声明**：仅申请 `bookmarks`、`storage`、`contextMenus`、`activeTab`，无任何网络访问权限

## 📐 实现方案

### 总体架构

- Manifest V3 扩展，TypeScript + Vite + CRXJS 构建
- 目录结构：
  ```
  src/
  ├── background/index.ts     # Service Worker：右键菜单、快捷键、pending 暂存
  ├── popup/
  │   ├── index.html          # 弹出面板入口
  │   ├── main.ts             # 面板主逻辑（设置/解锁/金库/选择器/导入导出/同步）
  │   ├── styles.css          # 面板样式
  │   └── icons/              # 内联 SVG 图标
  └── lib/
      ├── types.ts            # 领域类型、接口与常量
      ├── crypto.ts           # PBKDF2 + AES-256-GCM + AES-KW 会话包装
      ├── vault.ts            # 金库文档 CRUD、锁定/还原/搜索
      ├── vault-document.ts   # 金库文档校验与 ID 生成
      ├── bookmarks.ts        # Chrome 原生书签树读写封装
      ├── picker.ts           # 书签选择器（勾选/搜索/计数）
      ├── backup.ts           # 加密备份导出/导入
      ├── session.ts          # 会话生命周期（读写/过期/续期）
      ├── secure-utils.ts     # 常量时间比较、Base64、随机字节、内存擦除
      └── i18n.ts             # chrome.i18n.getMessage 封装
  tests/                      # Vitest 单元测试（mock chrome.* API）
  _locales/                   # zh_CN / en 消息包
  icons/                      # 扩展图标（通过 scripts/generate-icons.ps1 生成）
  ```

### 三种锁定方式

| 方式 | 说明 |
|------|------|
| **书签选择器** | 扩展面板内浏览/搜索原生收藏夹，勾选文件夹或书签后批量移入金库 |
| **网页右键** | 在任意网页右键选择"将当前页面锁入金库"，暂存 URL 到 session，打开面板后确认入库 |
| **快捷键** | `Alt+L`（Mac: `Cmd+Shift+L`）立即锁定金库，清除会话密钥 |

### 加密与数据模型

- 主密码经 PBKDF2（密钥派生 600,000 次迭代 + 随机 salt）派生 AES-256-GCM 密钥，密码校验单独 1,000,000 次迭代。每次加密使用新随机 IV。
- 每个被锁定的书签子树独立序列化为一个 JSON 后整体加密，隐藏目录结构。
- 本地存储结构：
  - `vaultDocument`：版本、双盐、密码校验器、加密条目列表
  - 每个条目：`{ id, createdAt, payload: { enc: "b64", iv, data } }`
  - `chrome.storage.session`：解锁后的包装密钥（AES-KW 包装 + 原始 wrap key），浏览器重启即清空
- 锁定流程：序列化子树 → 加密 → 写入金库 → 从原生收藏夹 `removeTree` 移除
- 还原流程：解密后按原父路径尽力恢复，找不到则放入"Gents' Mark 金库"文件夹
- 会话恢复：从 `chrome.storage.session` 读取包装密钥 → AES-KW 解包 → 恢复 CryptoKey → 无需重新输入密码

> ⚠️ 注意：锁定产生的删除会随 Edge 收藏夹同步传播；加密内容默认只在本机，其他设备看不到明文书签。

### 自动锁定

- 无需 `idle` 权限：记录 `session.lastActivity`，面板打开或交互时校验 5 分钟超时阈值
- 监听 `mousemove`、`mousedown`、`click`、`keydown`、`input`、`focus` 事件刷新活动时间
- 每 30 秒定时检查，超时自动清空会话密钥
- 监听 `chrome.storage.session` 变化（如快捷键触发），即时响应锁定

### 可选同步

- 手动触发：将整个金库文档 JSON 写入 `chrome.storage.sync`，随 Edge 账号同步到其他设备
- 密码与会话密钥永不进入同步；其他设备需安装同一扩展并输入同一主密码后才能解锁
- 配额限制：总量约 100KB，超出时提示用户；适合中小规模书签库
- 首次启动时自动检测 sync 中的金库数据，发现后拉取到本地

### 备份与恢复

- **导出**：一键下载 `gents-mark-backup.json`，包含完整金库文档（加密条目 + 元数据）
- **导入**：选择备份文件 → 输入主密码验证 → 确认覆盖当前金库
- 格式兼容：备份文件即金库文档的 JSON 序列化，可跨设备迁移

### 已实现的功能对照

| 功能 | 状态 |
|------|------|
| 双盐 PBKDF2（密钥 600K / 校验 1M 迭代） | ✅ |
| 会话保持（stay unlocked，AES-KW 包装） | ✅ |
| 自动锁定（5 分钟超时，事件监听） | ✅ |
| 原生书签选择器（文件夹树 + 勾选 + 搜索 + 子级计数） | ✅ |
| 网页右键暂存流程（pending → 打开面板 → 确认入库） | ✅ |
| 加密 JSON 备份/恢复 | ✅ |
| 快捷键锁定（Alt+L） | ✅ |
| 中英双语 | ✅ |
| chrome.storage.sync 可选同步 | ✅ |

### 待规划功能

- 胁迫密码（独立密码触发全量清空，紧急销毁场景）
- 全屏管理器（独立标签页浏览金库）
- 明文 HTML 导出（需重新输入主密码）
- 改密码（两步写入，崩溃安全）
- 自动锁定收件箱（拖入特定文件夹自动加密）


## 📜 开源许可

基于 MIT 许可证开源发布。你可以自由使用、修改和分发，但请保留原始版权声明。

---

## 🔒 隐私政策 | Privacy Policy

请阅读我们的[隐私政策](docs/index.html)以了解本扩展如何处理您的数据。

Please read our [Privacy Policy](docs/index.html) to understand how this extension handles your data.

*保持优雅，保持私密。*