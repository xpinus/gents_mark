## Why

Gents' Mark 目前只有 README 方案，没有可运行的扩展。v0.1 要交付一个可安装到 Edge 的核心闭环：设置主密码、把原生书签加密移入金库、金库内浏览/打开/还原、网页右键锁定和自动锁定会话，并用 TypeScript 实现，为 v0.2 的可选同步打底。

## What Changes

- 搭建 TypeScript + Vite 的 Manifest V3 扩展工程，含背景 service worker、popup 面板、静态图标与构建脚本。
- 新增主密码能力：首次设置、解锁、手动锁定、无操作自动锁定与会话清理。
- 新增加密模块：双盐 PBKDF2 密钥派生、AES-256-GCM、版本化密文格式与格式标记。
- 新增金库能力：锁定（加密后从原生收藏夹删除）、浏览、搜索、打开、还原、删除。
- 新增原生书签选择器：树形勾选、子级计数、搜索，用于把现有书签/文件夹移入金库。
- 新增网页/链接右键“锁入金库”的待确认流程，使用 `chrome.storage.session` 暂存待锁定页面。
- 新增加密备份：导出/导入加密 JSON 文件，导入时校验格式与密码。
- 权限保持最小化：`bookmarks`、`storage`、`contextMenus`、`activeTab`，无网络访问权限。

## Capabilities

### New Capabilities

- `master-password`: 主密码设置、解锁、锁定、无操作自动锁定与会话生命周期
- `vault-crypto`: 双盐 PBKDF2 + AES-GCM 加解密、版本化密文存储格式
- `vault`: 金库条目的锁定、浏览、搜索、打开、还原与删除
- `bookmark-picker`: 原生书签树的浏览、搜索与子树选择
- `context-menu-lock`: 网页/链接右键锁定的待确认流程
- `backup`: 加密备份文件的导出、校验与导入

### Modified Capabilities

- 无。

## Impact

- 新建完整扩展工程：`package.json`、`tsconfig.json`、Vite 配置、`src/`、`public/icons/`、`manifest`。
- 新增运行时依赖：`typescript`、`vite`、`@crxjs/vite-plugin`（或等价 MV3 构建方案）。
- 使用 Edge/Chrome MV3 API：`chrome.bookmarks`、`chrome.storage`、`chrome.contextMenus`、`chrome.action`、`chrome.runtime`。
- 本仓库目前无生产代码，无破坏性变更；README 中的待定决策将落定：`activeTab` 纳入 v0.1，技术栈改为 TypeScript。
