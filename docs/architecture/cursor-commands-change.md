# Cursor commands 独立维护

日期：2026-09-12。本次只调整 Agent 指令入口和维护工具，未提交、推送、部署或修改业务实现。

## 官方支持与仓库选择

- Codex 已弃用自定义 prompts，推荐 skills；旧 prompts 的官方目录是 `~/.codex/prompts`，不是仓库 `.codex/commands`。这不表示 Codex 内置 slash commands 被取消。[官方说明](https://developers.openai.com/codex/custom-prompts)
- Cursor 仍支持项目 `.cursor/commands` 中的自定义命令。[官方说明](https://cursor.com/docs/reference/deeplinks#commands)
- 按用户要求，命令只在 `.cursor/commands/*.md` 直接维护；不向 Codex 同步，也不在 `.agents` 维护命令源。

## 已完成

1. 将现有 `setup-saas-feature.md` 从共享源迁到 `.cursor/commands`，将原软链接替换为真实文件；保留已有流程与安全约束。
2. 删除 `.codex/commands` 链接及空目录、旧 `.agents/commands`、`scripts/sync-commands.sh` 和 package 的 `sync:commands`。
3. 将同步器收敛为 `syncSkills(root, apply)`，只同步两 Agent 的 skills。旧 commands 目录重新出现时失败并报告，不自动覆盖或清理。
4. AGENTS、Ray API skill、Cursor rules 与维护文档改为直接引用共享 skills。Engine/PG 开发仍要求读取公共架构规则，不依赖 Cursor command。
5. 新版隔离评测将基线内的命令镜像替换为 Cursor 本地文件，并记录布局版本；旧版对照和已有评测样本保留历史内容，不追溯改写。

共享规范继续位于 `.agents/skills`；`.codex/skills` 与 `.cursor/skills` 仍为共享技能入口。本次采用 `skill-creator` 的职责分离原则：命令只是快捷路由，公共架构要求不成为 Cursor 独占规范。`ray-api-flow` 保留资源归属和分层要求；通过 `nx-workspace` / `nx-run-tasks` 核验和执行维护目标。

## 本地验证

- `NX_DAEMON=false NX_NO_CLOUD=true pnpm nx run-many -t lint,test,validate,sync-check -p skills-maintenance --skip-nx-cache`：通过；32 个确定性测试通过，0 skip。
- 39 个 skills（35 外部、4 本地）的结构、引用与来源摘要校验通过。
- `pnpm sync:skills` 连续运行两次：均无缺失、创建或覆盖；commands 不属于同步目标。
- 新增 fixture 覆盖命令内容不被修改、镜像不被创建、退役路径/悬空链接拒绝、隔离复制不追随旧命令链接及非法源预检。
- `ray-api-flow` 通过 `skill-creator` 的结构校验。
- `git diff --check` 通过。

本次没有运行付费 Agent 生成任务，也没有将 Cursor 登录成功或静态文件存在视为 UI 命令实测通过。
当前 `ray-api-flow` 内容摘要为 `898f4ba2c7edc668f444560c8b4f9761510aeebbe828291618975725740bf459`；由于路由变化，旧行为结果仅为历史证据，不代表当前候选已完成两 Agent 行为验收。

## 以后怎么使用

- Cursor：直接编辑 `.cursor/commands/setup-saas-feature.md`，或新增同目录 Markdown 文件；在 Cursor 输入 `/` 选择命令，不再运行同步。
- Codex：使用 `AGENTS.md` 与 skills，例如请求“使用 `$ray-api-flow` 设计接口”。
- 共享技能变更：编辑 `.agents/skills`，需要补入口时运行 `pnpm sync:skills`。

删除的是仓库命令源旧位置、镜像和同步脚本，不涉及用户全局 Agent 配置。命令内容保留在 Cursor 文件内，原跟踪版本可从 Git 恢复。历史审计中保留旧路径属于证据，不是当前操作指南。
