## 1. 工程脚手架

- [x] 1.1 初始化 `package.json`、`tsconfig.json`、`vite.config.ts` 与 CRXJS `manifest.config.ts`（MV3，权限 `bookmarks`、`storage`、`contextMenus`、`activeTab`）
- [x] 1.2 安装并固定依赖：`typescript`、`vite`、`@crxjs/vite-plugin`、`vitest` 及类型包
- [x] 1.3 创建 `src/` 目录结构（background、popup、lib）与占位入口，跑通 `npm run build` 和 `npm run dev`
- [x] 1.4 生成 16/32/48/128 扩展图标并接入 manifest

## 2. 加密与数据模型

- [x] 2.1 实现安全工具：Uint8Array/字符串清理、base64、constant-time 比较
- [x] 2.2 实现加密模块：双盐 PBKDF2 密钥派生、AES-256-GCM 加解密、`enc: 'b64'` 格式标记
- [x] 2.3 实现版本化 vault document：结构校验、序列化/反序列化
- [x] 2.4 实现会话模块：AES-KW 包钥、restore/clear、`lastActivity` 记录
- [x] 2.5 为加密与存储格式编写 Vitest 单元测试（mock `chrome.storage`）

## 3. 主密码与自动锁定

- [x] 3.1 popup 首次设置界面：双输入、最小长度校验、不可找回确认
- [x] 3.2 popup 锁屏界面：解锁校验与错误提示
- [x] 3.3 手动锁定：清 session 密钥、清明文数据与缓存
- [x] 3.4 无操作自动锁定：活动事件监听、`lastActivity` 检查、默认 5 分钟阈值
- [x] 3.5 注册 `Alt+L` 锁定快捷键（`chrome.commands`）

## 4. 金库核心

- [x] 4.1 实现原生书签工具：读取树、子树序列化、按父路径创建、`remove`/`removeTree`
- [x] 4.2 实现锁定：加密写入金库 + 原生删除 + 失败回滚
- [x] 4.3 实现还原：解密、原父路径恢复、兜底“Gents' Mark 金库”文件夹、成功后移除条目
- [x] 4.4 实现删除、打开、URL 直添与大小写不敏感搜索
- [x] 4.5 为锁定/还原流程编写单元测试（mock `chrome.bookmarks`）

## 5. 原生书签选择器

- [x] 5.1 popup 书签选择器：树渲染、展开/折叠、父子勾选联动、子级计数
- [x] 5.2 选择器搜索过滤
- [x] 5.3 确认弹窗与锁定执行、成功/失败反馈
- [x] 5.4 选择与搜索逻辑单元测试

## 6. 网页右键锁定

- [x] 6.1 background 创建 `page`/`link` 右键菜单，捕获 URL/title 并过滤非 http(s)
- [x] 6.2 pending 流程：`chrome.storage.session` 暂存、`chrome.action.openPopup()`（含 fallback）、popup 待添加横幅
- [x] 6.3 解锁后确认添加进金库

## 7. 加密备份

- [x] 7.1 导出加密 JSON 备份文件
- [x] 7.2 导入：文件格式校验、密码验证、确认替换、staging key 写入
- [x] 7.3 备份导入导出单元测试

## 8. 界面与打包收尾

- [x] 8.1 popup 视觉与文案：锁屏、金库树、选择器、设置、空状态、加载/错误态，中英文 i18n
- [x] 8.2 更新 README：TypeScript 技术栈、权限、PBKDF2 迭代次数、待定决策落定
- [x] 8.3 `npm run build` 产出扩展包，Edge “Load unpacked” 手工验证核心流程
- [x] 8.4 修复验证中发现的问题并复测
