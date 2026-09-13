# 开发 Agent 支持范围变更

2026-09-12，按用户明确要求：仅支持 **Codex 和 Cursor**。

后续调整：[Cursor commands 独立维护](./cursor-commands-change.md)。下列 commands 同步描述与测试为本次退役时的历史记录，不再是当前维护方式。

## 已实施

- 删除仓库根 `CLAUDE.md` 和 `.claude`：后者包含 39 个 skill 链接、1 个 command 链接及空目录。删除前逐一验证相对链接目标，未删除 canonical 内容或真实 worktree。
- `sync:skills` 与 `sync:commands` 只面向 `.codex` / `.cursor`，四个本地 skills 共有 8 个入口。
- 同步、评测执行器、环境变量白名单、预算检查和行为证据统一使用两 Agent 清单；拒绝退役 Agent 参数，不再读取其全局配置或透传凭据。
- 候选 PR 文案、Nx cache inputs、初始化文档、开发指南、目录扫描及 ignore 配置同步调整。
- `.gitignore` 仅保留退役目录的整体忽略规则，防止误启动旧工具后提交本地凭据；不可缓存的同步检查仍拒绝该目录存在。这不是重新支持该工具。
- `teach-impeccable` 写入共享 `AGENTS.md` 并使用当前 Agent 的问答能力；`frontend-design` 移除专属 Agent 指令。两个外部 skill 记录用户授权本地补丁及新摘要，保留来源 SHA、历史摘要与许可证署名，仍不自动覆盖。
- 后续隔离副本对旧／新两组一致移除退役入口，并在隔离元数据中记录；已存在的历史评测副本和失败日志不改写。

## 验证

- `skills-maintenance` 的 lint、test、validate、sync-check 通过；28 个测试、0 失败、0 skip。另运行服务边界检查，4/4 通过。
- `pnpm sync:skills` 与 `pnpm sync:commands` 均实际执行两次，重复执行未新增／覆盖链接，也未重新创建退役目录。
- 测试覆盖两个有效 Agent、拒绝退役 Agent、同步不创建退役目录、行为证据只要求 Codex/Cursor 四个新版协议场景。
- Cursor 当前 CLI `2026.01.23-916f423` 的登录查询和模型列表请求成功。
- 使用与评测相同的最小环境，在新空目录中执行 `--print --mode ask --sandbox enabled`，真实返回 `RAY_CURSOR_AUTH_OK`，退出码 0；不是仅依据“已登录”提示判断。
- 本次认证探针不生成业务代码，不算 REST/WS 场景通过；没有启动新一轮代码生成或修改历史预算。

## 保留范围

历史评测、阶段零审计、许可证／上游来源 URL 以及产品页面的模型展示保留。这些文字不构成开发 Agent 接入。
不修改用户全局 Agent 安装、账号、token 或后台 worker；本轮仍未提交、推送、部署或启用定时维护。
退役入口的已跟踪文件可由 Git 历史恢复；原有 symlink 内容可由 `.agents` canonical 源重建。

## 还未完成

双 Agent 完整生成矩阵、旧／新对照、重复评测及慢网络背压等仍按原报告追踪。退役 Agent 不再阻断，但不会把历史失败改写成成功。
后续生成仍使用原累计上限（首轮 12、追加 6）；调整后的首轮场景清单为 10 项，不自动扩充任务或重置预算。
