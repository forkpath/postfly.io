# Ray Skills 本地实施与验收报告

日期：2026-09-12。确认基线：`9546f88a93122d3db1251496188c80c89862b5f9`。

最新范围：[仅支持 Codex/Cursor 的变更记录](./agent-support-change.md)，以及 [Cursor commands 独立维护](./cursor-commands-change.md)。下文历史测试结果不因此自动升级为完整验收通过。

## 结论

**技能重构与维护工具已经本地实现；两 Agent 全量行为验收尚未完成，不能宣布整个计划验收通过。**
本轮没有提交、推送、创建实施 PR、部署、执行生产迁移或升级运行时依赖。
逐次执行结果见 [评测台账](./skills-agent-evaluations.json)，工作包状态见 [实施台账](./skills-maintenance-tracker.md)。

## 已交付的内容

| 内容 | 实现与意义 | 验证边界 |
| --- | --- | --- |
| 迁移基线 | 完成既有迁移路径归类，用户确认完整 SHA 后才创建隔离副本 | 不把旧迁移提交或局部 lint 视为部署完成 |
| 外部来源治理 | 35 个外部 skills 逐项审查、补 3 个缺失来源；完整 SHA 与内容 hash 分开保存 | 仅 `nx-generate` 应用兼容升级，其余保留；详见来源报告 |
| 四个本地 skills | 公共架构、REST、原生 WS、全栈页面编排分离，按需读取 references | skill 是 Agent 指引，不能替代可执行权限与架构门禁 |
| 两 Agent 入口 | `.agents/skills` 唯一源，Codex/Cursor 共 8 个本地 skill 软链接 | 链接通过不等于两个 Agent 均已成功生成及测试 |
| 维护工具 | 检查只读、候选隔离、同步冲突即失败；固定来源 SHA、摘要及执行权限 | 文档候选仍需人工语义／许可证审查，不自动合并 |
| 候选 PR 模板 | 只读准备与有写权限发布分 job，来源分组、复用 draft PR、目标 dev | 模板放在 tools 下，未进入默认分支工作流目录，未启用 schedule |
| 验收工具 | 真实 PG/Redis/Auth 身份、REST/WS wire checks、层次检查、故障变异、预算限制 | 受控本地基础场景；不等于生产压测或全部平台能力验收 |

## 本地规范如何重构

- `ray-api-flow`：资源／权限、数据模型复用、Domain、Use Case、持久化、消息可靠性与运行时选库。RabbitMQ／Worker 仍是公共异步规则，不混入 WebSocket。
- `ray-rest-api-flow`：共享 Zod 契约、DTO、CQRS、Use Case、Infrastructure、Controller、API client；保留 `/api/v1` 和 `/api/auth` 双通道及既有响应约定。
- `ray-websocket-api-flow`：Nest WsAdapter／原生 ws、Session、组织授权、版本化消息、ack/error、撤权／过期、Redis 广播、重连、背压及清理。未将现有 Pulse 缺陷写成标准。
- `ray-module-dev`：全栈任务拆解与顺序、共享 Studio 页面、Web/Desktop 路由和状态，Mobile/Extension 专属规则按需读取，不再复制完整后端教程。

`skill-creator` 的职责聚焦和按需引用方式用于缩小入口；`nx-workspace` 用于匹配真实项目／public API；`ray-api-flow` 保留所有权与实现顺序。没有用增加 tags 代替服务内部依赖检查。

原 `.cursor/skills/ray-module-dev` 的 4 个独立文件已迁入 canonical 职责与 references，并替换为软链接。
冗长的复制示例、不安全类型断言及过时引用没有继续作为模板；原文可从确认基线恢复。
**没有删除归属不明文件，也没有删除原库、可选 adapter 或业务功能。**

## 工具为何放在 tools／scripts

`tools/skills-maintenance` 是独立 Nx 项目，容纳可测试的维护实现、治理 manifest 和验收器。
`scripts/sync-skills.sh` 只转发 skills 同步；Cursor commands 直接维护，不再提供命令同步脚本。
`scripts/skills/audit-baseline.mjs` 与基线报告保留首次审计证据，不成为上游下载／升级脚本。

可缓存：确定性 lint、test、validate。不可缓存：网络检查、候选写入、链接同步、Agent 生成、真实数据库验收。
维护工具不依赖未经版本确认的 `skills check`，不执行上游提供的脚本，也不修改 Ray 根运行时依赖。

## 已验证的结果

- 四个入口全部通过 `skill-creator` 自带结构校验器；PyYAML 6.0.2 仅安装在隔离临时工具环境。
- 本地 Nx 维护目标 lint／test／validate／sync-check 通过；最初 27 项确定性测试，双 Agent 调整后复验 28/28，另有服务边界检查 4/4。逐项独立接口与变异结果及本次调整见 [验收证据](./skills-validation-evidence.json)。
- 在线上游检查及隔离候选准备成功：35 个条目，8 个内容未变、27 个暂缓，0 个新候选。注意“内容未变”与“已批准兼容”不同，不能互换。
- Codex 新版 REST：独立 8/8 真实 HTTP／PG 检查通过；它自行执行的首次集成测试因沙箱网络限制失败，不能用父验收器通过替代 Agent 自测通过。
- Codex 新版 WS：自行执行 Nx typecheck／lint／test，5 个测试、0 skip；独立 13/13 检查通过，包括真实两实例 Redis、跨组织拒绝、撤权、过期、非法消息和重连。
- REST 的 DTO、归属过滤、Domain 数据库依赖，以及 WS 授权／撤权，共五种变异均被独立验收器的目标断言检出。
- 两个 Codex 样本各核对 1,825 个受保护已跟踪文件，未发现越界修改。此检查不声称覆盖每个新增未跟踪文件或证明操作系统沙箱隔离。

## 尚未完成／不能推导的结论

1. Cursor 登录已由用户恢复，随后通过隔离目录下的非交互实际调用；这仅解除认证阻断，完整 REST/WS 代码生成与测试仍需继续。
2. 按用户最新要求，Claude 开发支持已移除，原失败记录仅为历史证据，不再是必选验收或当前阻断；已消耗预算保留，不自动重置。
3. 旧版、新版混合和重复对照矩阵尚未完成。启动配置与环境修正已记录，不能据此声称新版比旧版“成功率提升”。
4. WS 慢网络背压仍非完整真实网络验收；目前含阈值单测与基本连接测试。平台压测、撤权竞争压力与所有生命周期组合未全部验证。
5. AST 层次检查捕获源码导入、barrel、动态导入和明显缺失层，不能证明任意程序的全部运行时调用关系；仍需审阅实际 Handler → Use Case → Port。
6. GitHub 发布器仅本地验证，未真实创建更新 PR；分支保护、环境审批、人工行为证据合并要求尚未在 GitHub 配置。代码中的“要求”不是已启用的服务端强制门禁。

## 后续顺序

当前已使用首轮 4/12、追加 3/6。Cursor 非交互认证已恢复；后续在剩余预算内继续 Codex/Cursor 和旧／新对照，补齐慢网络及生命周期验证。
候选内容或技能摘要变化后，相关评测必须重跑；不要删除失败记录重新计算预算。
最后由用户决定何时合并本地交付、设置每周时间并启用 GitHub 模板。

操作命令与启用前提：[维护说明](../../tools/skills-maintenance/README.md)。
来源与暂缓理由：[逐项来源报告](./skills-upstream-review.md)。
原迁移问题：[阶段零审计](./skills-baseline-audit.md)。Engine／Pulse 修复及生产部署仍在本轮范围外。

## 安全提醒

一次本地进程诊断意外带出了 Cursor worker 的命令行凭据；未使用、未写入本轮仓库文件或报告。
建议用户轮换该 worker 凭据。报告不记录其值，也不通过读取后台 worker 凭据绕过 CLI 登录。
