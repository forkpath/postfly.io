# Ray Skills 维护操作

本地交付，不代表 GitHub 自动化已启用，也不代表两 Agent 行为验收全部通过。
实施状态见 `docs/architecture/skills-maintenance-tracker.md`；来源审查见
`docs/architecture/skills-upstream-review.md`。

## 内容和职责

- `.agents/skills`：唯一内容源；四个 `ray-*` 为本地规范，不参与上游升级。
- `.codex/skills`、`.cursor/skills`：相对软链接。
- `.cursor/commands`：Cursor 直接维护的真实 Markdown 文件，不属于 skills 同步范围。
- `sources.json`：来源、完整观察 SHA、内容摘要、本地修改及人工兼容性判断。
- `skills-lock.json`：保留既有格式；新治理信息不假装旧 hash 是版本锁。
- `core.mjs` / `cli.mjs`：无第三方 skills CLI，检查、准备、同步三个独立操作。
- `candidates.mjs` / `publish.mjs`：按来源组合候选，后者单独持有 PR 写权限。
- `evaluation/`：仅隔离验收，不修改 Engine/Pulse，不定义产品业务事件。

## 日常操作

在仓库根目录使用已安装的 Node 24、pnpm 10.25，不使用动态 `latest` 或临时下载 CLI。

```sh
pnpm nx run-many -t lint,test,validate,sync-check -p skills-maintenance --skip-nx-cache
pnpm nx run skills-maintenance:upstream-check
pnpm nx run skills-maintenance:sync-check
pnpm nx run skills-maintenance:sync
```

`upstream-check` 只读仓库，比较公共上游并输出 JSON；网络不可用或本地冲突返回非零。
源 Git clone 只在新临时目录进行，不读取用户 Git 凭据，不运行上游脚本。
`sync-check` 不写入；`sync` 先检查两 Agent 的 skills 入口，再补缺失 skill 链接。
遇到真实目录、错误／悬空链接、未知入口或父目录链接立即失败，不覆盖或删除。
`pnpm sync:skills` 调用此同步器；commands 同步脚本与 package 命令已删除。
发现退役的 commands 镜像目录时失败并报告，不擅自删除。Cursor commands 原文不被同步器读取或修改。

准备全部合格候选到一个**尚不存在**的目录：

```sh
pnpm nx run skills-maintenance:candidates -- /tmp/ray-skills-candidates-UNIQUE
```

生成 `report.json`、`bundles.json` 及按来源分组的候选目录。重复使用该路径失败，防止覆盖上一次证据。
未更改的来源不生成候选；改名、删除、脚本变更或本地分歧转人工处理。
也可将检查的纯 JSON 保存后单独准备一个来源：

```sh
pnpm nx run skills-maintenance:prepare -- --report /ABS/report.json --source nrwl/nx-ai-agents-config --destination /ABS/NEW_DIR
```

报告不得包含 Nx 控制台前缀；自动脚本直接捕获 CLI 的 JSON。候选摘要不匹配、来源 SHA 改变或治理记录变化均中止。
当前工具对纯文档更新只给出**候选资格**，不替代语义、安全、许可证及行为评审。

## GitHub 自动维护：仍未启用

模板是 `workflows/weekly.yml`，故意放在 `.github/workflows` **之外**，没有 schedule。
启用前需要维护者单独完成：

1. 确认每周工作日、时刻与时区，换算 UTC；将模板放入 `.github/workflows` 并进入默认分支 `main`。
2. 确保工具在 `dev` 存在；配置仓库变量 `RAY_SKILLS_MAINTENANCE_ENABLED=true`。
3. 创建受保护 environment `skills-maintenance-publish`、审核人员和最小 contents/PR 写权限。
4. 将确定性检查与人工行为证据纳入分支保护／合并评审。**本轮没有替用户配置服务端规则。**
5. 手动试运行并确认草稿 PR 目标为 `dev`、同来源复用分支、候选变动使旧证据失效。

只读 job 不注入业务密钥，安装关闭 lifecycle scripts；有写权限的 job 不安装依赖、不执行候选脚本、不调用模型。
Action 全部锁定完整 Commit。发布器仅在显式 `RAY_SKILLS_PUBLISH=enabled` 时启动，不自动合并。
按本次核实的 [GitHub 官方说明](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)，`GITHUB_TOKEN` 创建／更新 PR 的 opened、synchronize、reopened 事件可产生**待人工批准**的 workflow；其他许多事件不会递归触发。启用时需要维护者批准这些 CI，或单独配置受控 GitHub App token，不能假定创建 PR 后 CI 无人值守运行。
模板及发布器只做本地确定性验证，**未实发 GitHub PR**。

## 隔离 Agent 评测

已确认基线写入 `sources.json`。每次从该 SHA 的 Git archive 创建新目录；新版仅叠加本地 skills 与协调入口。
新版隔离副本使用 Cursor 本地 commands 布局并移除旧镜像，记录 `commandLayout: cursor-local-v1`。
旧版对照保留基线原始命令布局用于历史复现，不是当前支持入口；历史样本和结果不追溯改写。
本次 ray-api-flow 路由调整改变候选摘要，旧行为结果只能作为历史证据，须按新摘要重新评测。
依赖使用独立 copy-on-write 副本；不升级依赖，不复制根 `.env`。
每次测试创建 loopback 随机端口的专用 PostgreSQL/Redis、真实 Better Auth 测试用户，结束清理本次容器。

```sh
pnpm nx run skills-maintenance:agent-evaluation -- codex REST new
pnpm nx run skills-maintenance:agent-evaluation -- cursor WS new
pnpm nx run skills-maintenance:agent-evaluation -- cursor REST new --retry
pnpm nx run skills-maintenance:verify-generated -- /ABS/ISOLATED_WORKSPACE REST
```

执行器串行加锁，首次最多 12 次、追加最多 6 次；启动失败也保守计数。不自动运行剩余任务以绕过认证失败。
当前只接收 `codex` / `cursor`；已退役 Agent 的启动代码、凭据透传和验收必选项均已移除，历史记录不清零。
当前首轮场景清单为 10 项（新版 REST/WS 共 4、Codex 旧版 2、混合 2、重复 2）；原总预算上限不扩大，也不把退役场景自动替换为新任务。
保留用户已配置模型／provider；仅传该 Agent 的认证环境，不传业务 DB、GitHub 或另一 Agent 凭据。不要把含凭据的原始日志提交仓库。
`--retry` 是明确追加记录，不能用删除台账重置预算。`tests: pending` 不是通过。

独立验证器必须在生成结束后运行，不能预先交给生成 Agent。`mutation-check -- /ABS/WORKSPACE REST`（或 `WS`）只对指定已生成样本的新副本进行故障注入，验证失败必须命中特定断言，而非任意启动错误。变异锚点绑定本轮样本结构，不假装适用于任意未来实现。
REST/WS 真实检查通过也不等于完整平台压测；心跳时序、背压、关闭清理及变异覆盖需按验收报告如实记录。

```sh
pnpm nx run skills-maintenance:behavior-evidence -- /ABS/EVIDENCE.json CANDIDATE_SHA256
```

证据必须包含对应摘要、基线、真实 CLI/模型、Agent 自行执行测试和独立测试结果及日志摘要。
该检查器验证证据结构和绑定，不替代维护者检查日志真实性。首次旧版／混合／重复对照矩阵另由实施台账跟踪。

## 缓存与回退

确定性 lint/test/validate 可缓存；网络检查、同步写入、候选准备、Agent 调用、真实数据库验收不可缓存。
只回退本轮明确文件，不执行 `git reset --hard` 或删除归属不明内容。旧 Cursor 技能由 canonical 入口替代，原文仍在确认基线 SHA 可恢复。
不修改公开 API、运行时依赖或数据库 migration；无需执行生产 DDL 回退。
