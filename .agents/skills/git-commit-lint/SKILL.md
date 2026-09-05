---
name: git-commit-lint
description: >-
  约束 git commit 提交格式（Gitmoji + Conventional Commits）。
  在 git 提交代码、编写 commit message、或用户要求检查/规范 commit 格式时使用。
  提交前用本技能校验 message，确保符合「✨ feat: <描述>」等格式。
---

# Commit Lint — Git Commit 格式约束

所有 commit（人类和 AI）统一遵循 **Gitmoji + Conventional Commits** 混合格式。

## 格式

```
<emoji> <type>: <简短描述>
```

- `<emoji>` 与 `<type>` **必须严格配对**（见下表），不允许错配。
- `<描述>` 用**中文**、简短、动词开头。**句末不加标点**。
- 关联 track 任务时在描述后追加 ID，如 `✨ feat: 实现用户登录 (JIRA-123)`。

## Emoji + Type 映射

| Emoji | Type | 用途 |
|:-----:|------|------|
| ✨ | `feat` | 新功能 |
| 🐛 | `fix` | 修复bug |
| ♻️ | `refactor` | 重构 |
| ✅ | `test` | 测试 |
| 📝 | `docs` | 文档 |
| 🔧 | `chore` | 构建/工具/依赖 |
| ⚡ | `perf` | 性能优化 |
| 💄 | `style` | 代码风格/格式 |

## 校验规则

1. 首行必须匹配正则（emoji 与 type 严格配对）：

   ```
   ^(✨ feat|🐛 fix|♻️ refactor|✅ test|📝 docs|🔧 chore|⚡ perf|💄 style): .+
   ```

2. 冒号后必须有一个空格 + 非空描述。
3. 描述句末不得以 `.`、`。`、`！`、`!` 结尾。
4. `Merge ...` / `Revert ...` 等 Git 自动生成的提交可豁免。

## 示例

```
✅ 正确
✨ feat: 实现用户登录模块
✨ feat: 添加JWT鉴权中间件 (JIRA-123)
🐛 fix: 修复空指针异常
♻️ refactor: 用户模块 → 身份模块 重命名
⚡ perf: 优化数据库查询性能
📝 docs: 更新API接口文档

❌ 错误
feat: 没有 emoji
✨ feat:没有空格
✨ feature: 错配 type
✨ feat: 描述带句号。
🐛 feat: 修复 (描述对了，但用了别的 emoji)
```

## 使用方式

### 初始化项目

使用 **git-commit-lint-init** 一键部署 hook 和脚本到项目。如果用户尚未初始化，先引导其执行：

> 使用 git-commit-lint-init 初始化项目

### 提交时

1. 按上表构造 message 首行，再 `git commit -m "..."`。
2. 初始化后，`.githooks/commit-msg` 会在 `git commit` 时自动拦截不合规 message 并提示修正。

### 交互式提交

初始化后可使用 `scripts/commit.sh` 交互式构造 commit message：

```bash
sh scripts/commit.sh
```

## 关键约束

- **emoji 与 type 必须一一对应**，这是最容易出错的地方。
- 描述用**中文**，简洁说明「做了什么」，而非「为什么」。
- 小步提交：每完成一个逻辑单元就提交一次，不攒改动。
