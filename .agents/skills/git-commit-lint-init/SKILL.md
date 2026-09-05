---
name: git-commit-lint-init
description: >-
  在用户要为新项目或现有项目设置 commit 格式校验时使用。在项目中初始化 git-commit-lint：创建 .githooks/commit-msg 和 scripts/commit.sh，并配置 git core.hooksPath。
---

# Git Commit Lint Init — 项目初始化

将 git-commit-lint 的 hook 和脚本部署到目标项目。

## 前置条件

- 目标项目是 git 仓库（`git rev-parse --show-toplevel` 可正常执行）
- 确保 `references/` 目录下包含可部署文件

## 部署文件

本 skill 的 `references/` 目录包含：

| 文件 | 目标路径 | 用途 |
|------|----------|------|
| `references/.githooks/commit-msg` | `<项目>/.githooks/commit-msg` | commit 格式校验 hook |
| `references/scripts/commit.sh` | `<项目>/scripts/commit.sh` | 交互式提交助手 |

## 初始化步骤

### 1. 定位源文件

源文件在本 skill 的 `references/` 目录下。找到本 skill 的安装路径：

- 源文件即在本 skill 目录的 `references/` 子目录下

### 2. 复制文件到项目

```bash
# 在项目根目录执行，SKILL_DIR 为本 skill 的安装路径

# 创建 .githooks 目录并复制 commit-msg hook
mkdir -p .githooks
cp "${SKILL_DIR}/references/.githooks/commit-msg" .githooks/commit-msg

# 创建 scripts 目录并复制 commit.sh
mkdir -p scripts
cp "${SKILL_DIR}/references/scripts/commit.sh" scripts/commit.sh
```

### 3. 配置 git hooksPath

```bash
git config core.hooksPath .githooks
```

### 4. 设置可执行权限（Linux/macOS）

```bash
chmod +x .githooks/commit-msg
chmod +x scripts/commit.sh
```

## 验证

初始化完成后，运行以下命令验证：

```bash
# 验证 hook 已配置
git config core.hooksPath
# 应输出：.githooks

# 测试 hook 校验
printf '%s\n' "✨ feat: 测试初始化" | sh .githooks/commit-msg
# 应输出：（无输出，exit 0 表示通过）
```

## 注意事项

- 如果项目已有 `.githooks/commit-msg`，先询问用户是否覆盖。
- 如果项目已有 `scripts/commit.sh`，先询问用户是否覆盖。
- 已有 `core.hooksPath` 配置时，询问用户是否覆盖。
- 初始化完成后，提醒用户后续提交会自动校验格式。
