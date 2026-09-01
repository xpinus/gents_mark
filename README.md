# 🎩 Gents' Mark

> *The discreet bookmark companion for gentlemen.*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Edge Add-on](https://img.shields.io/badge/Microsoft_Edge-Add--on-0078D7?logo=microsoft-edge)](https://microsoftedge.microsoft.com/)
![Version](https://img.shields.io/badge/version-0.1.0-blue)

**Gents' Mark** 是一款为 Microsoft Edge 打造的绅士书签加密扩展。它将你珍藏的数字印记妥善保管，让每一次浏览都保持优雅与从容。

> 当前状态：v0.1 核心闭环已实现，构建产物位于 `dist/`。

## ✨ 核心特质   

- **🔐 私密金库 (The Vault)**：采用 AES-256-GCM 加密算法，将你的私密书签牢牢锁在本地。钥匙，只在你手中。
- **🎯 一键上锁**：通过扩展面板的书签选择器或网页右键菜单，一键将书签或文件夹移入金库，操作流畅而优雅。
- **🕵️ 隐形模式**：上锁后的书签将从 Edge 原生收藏夹中消失，彻底隐身，旁人无从察觉。
- **⏳ 自动管家**：可设置无操作自动锁定时间（如5分钟），离开座位，金库自动闭锁。
- **📦 纯净本地**：所有数据默认仅存储于你的本地浏览器中；可选同步模式也只同步加密密文，你的珍藏只属于你自己。

## 🖼️ 界面预览

*(此处你可以放上一张扩展界面的截图，比如密码输入框或主面板)*

> 一个简洁的密码输入框，解锁你的私人世界。

## 🚀 快速上手

1.  从 Edge 扩展商店安装 Gents' Mark（链接待补充）。
2.  点击浏览器工具栏中的 🎩 图标，设置你的**主密码**（请务必牢记，密码无法找回）。
3.  打开扩展面板，在 **书签选择器** 中勾选想要保护的文件夹或书签，点击 **“移入金库”**；也可以在网页上右键选择 **“将当前页面锁入金库”**。
4.  需要查看时，点击 🎩 图标，输入密码即可浏览你的珍藏。

## 🛠️ 技术实现

- **加密标准**：[Web Cryptography API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) + AES-GCM 256-bit
- **密钥派生**：PBKDF2-SHA256（密钥 600,000 次迭代，密码校验 1,000,000 次）
- **存储方式**：默认 `chrome.storage.local`（数据仅存本地）；可选同步模式下使用 `chrome.storage.sync` 同步加密快照
- **权限声明**：仅申请 `bookmarks`、`storage`、`contextMenus`、`activeTab`，无任何网络访问权限

## 📐 实现方案

### 总体架构

- Manifest V3 扩展；仅申请 `bookmarks` 与 `storage`，无 host permissions、无网络权限。
- TypeScript + Vite + CRXJS 构建，`npm run build` 产出可直接 “Load unpacked” 的 `dist/` 扩展包。
- 目录结构：
  - `src/background/`：service worker，负责右键菜单、快捷键与待锁定暂存
  - `src/popup/`：密码设置/解锁、书签选择器、金库浏览面板
  - `src/lib/crypto.ts`：PBKDF2 密钥派生 + AES-GCM 加解密
  - `src/lib/vault.ts`：金库数据模型与锁定/还原/删除
  - `src/lib/bookmarks.ts`：原生书签树读写封装
  - `tests/`：Vitest 单元测试（mock `chrome.*` API）
  - `icons/`、`_locales/`：扩展图标与中英文文案

### 关键交互取舍

WebExtensions 的 `contextMenus` 无法出现在 Edge 收藏夹管理器的原生右键菜单中，因此原“收藏夹内右键移入金库”不可行，采用替代交互：

- v0.1 主力：扩展面板内的 **书签选择器**，浏览/搜索原生收藏夹，勾选后移入金库。
- 网页右键 **“将当前页面锁入金库”**，需要可选新增 `activeTab` 权限。
- 后续可选：**自动锁定收件箱**，用户把书签拖入特殊文件夹后，扩展自动加密并移除。

### 加密与数据模型

- 主密码经 PBKDF2（密钥派生 600,000 次迭代 + 随机 salt）派生 AES-256-GCM 密钥，密码校验单独 1,000,000 次迭代，每次加密使用新随机 IV。
- 每次锁定把整棵书签子树序列化为一个 JSON 后整体加密，隐藏目录结构。
- 本地存储结构：
  - `vault.meta`：版本、salt、密码校验器
  - `vault.items`：加密条目（id、iv、encryptedBlob、createdAt）
  - `chrome.storage.session`：解锁后的会话密钥（内存态，浏览器重启即清空）
- 锁定流程：序列化子树 -> 加密 -> 写入金库 -> 从原生收藏夹 `removeTree` 移除。
- 还原流程：解密后按原父路径尽力恢复，找不到则放入“Gents' Mark 金库”文件夹。
- 注意：锁定产生的删除会随 Edge 收藏夹同步传播；加密内容默认只在本机，其他设备看不到明文书签，也不会自动拥有金库副本。

### 自动锁定

- 默认不申请 `idle` 权限：记录 `session.lastActivity`，面板打开或交互时校验超时阈值并清空会话密钥。
- 若要检测系统级无操作，后续可新增 `idle` 权限。

### 可选同步（v0.2+，默认关闭）

- 开启后把整个金库压缩、分块加密后写入 `chrome.storage.sync`，随 Edge 账号同步到其他设备。
- 密码与会话密钥永不进入同步；其他设备需安装同一扩展并输入同一主密码后才能解锁。
- 配额限制：总量约 100KB、单条 8KB、最多 512 条，适合中小规模书签库；设置页展示占用并预警。
- 冲突策略：整包快照 + 时间戳，后写覆盖先写，定位为“一台主设备维护，其他设备查看/还原”。
- 超出容量或需要手工迁移时，提供加密导出/导入文件；更大的自动同步可后续支持用户自备 WebDAV。

### 开发里程碑

1. 项目骨架 + 密码设置/解锁 + 自动锁定会话
2. 加密/存储模块 + 锁定与还原
3. 面板书签选择器 + 金库浏览/搜索/打开/还原/删除
4. 网页右键锁定 + 图标/打包/README 收尾 + Edge 手工验证

### 待定决策

- `activeTab` 权限已纳入 v0.1，用于网页右键锁定
- “自动锁定收件箱”文件夹未纳入 v0.1，留待后续版本
- `chrome.storage.sync` 可选同步未纳入 v0.1，属于 v0.2

## 🧭 竞品参考

参考项目：[Holy Private Bookmarks](https://github.com/OSV-IT-Studio/holy-private-bookmarks)（GPL-3.0，Chrome Web Store 在架）。

### 定位差异

- 该项目把原生书签“导入”到自己扩展内部的加密管理器，**不删除原生书签**。
- Gents' Mark 定位不同：锁定 = 加密入金库 + 从原生收藏夹删除，保持隐形。

### 值得借鉴

- **双盐 PBKDF2**：密钥派生 600,000 次，密码校验 1,000,000 次，constant-time 比较；加密结果带 `enc: 'b64'` 格式标记，为后续迁移留后路。
- **会话保持（stay unlocked）**：解锁密钥可选写入 `chrome.storage.session`，浏览器重启即失效。
- **自动锁定**：监听鼠标/键盘/输入/焦点/页面可见性事件重置超时，锁定时清除密钥、明文数据树和缓存。
- **胁迫密码**：独立密码触发全量清空，回到首次设置界面，适合需要“紧急销毁”场景。
- **原生书签选择器**：文件夹树 + 勾选 + 子级计数，勾选父级自动包含子级。
- **网页右键待添加流程**：右键时暂存 `pendingBookmarkAdd` 到 session，打开 popup，解锁后确认入库。
- **加密 JSON 备份/恢复**；明文 HTML 导出时强制重新输入主密码。
- **改密码两步写入**：先写临时备份 key，再覆盖主数据，崩溃安全。
- **全屏管理器单标签管理** + 快捷键（锁定、打开管理器）。

### 不采纳项

- 宽权限集合（`history`、`tabs`、`tabGroups`、`scripting`、`clipboard*` 等），本项目保持最小权限。
- 只导入不删除原生书签的做法，与“隐形”定位不符。
- 直接复制代码：该项目为 GPL-3.0，本项目为 MIT，只借鉴功能与交互模式。

### 吸收排期

- v0.1：书签选择器、双盐加密、自动锁定、pending 右键流程、加密备份。
- v0.2：stay-unlocked 会话、胁迫密码、HTML 导出、全屏管理器。

## 📜 开源许可

基于 MIT 许可证开源发布。你可以自由使用、修改和分发，但请保留原始版权声明。

---

*保持优雅，保持私密。*
