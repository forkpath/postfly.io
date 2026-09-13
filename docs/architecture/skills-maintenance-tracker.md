# Ray Skills 实施台账

最后更新：2026-09-12。

## 当前门禁

- 候选迁移基线：`9546f88a93122d3db1251496188c80c89862b5f9`（arch）。
- 用户确认：**已确认**；2026-09-12 用户回复“是的”，明确接受上述完整 SHA。
- 阶段零报告：[skills-baseline-audit.md](./skills-baseline-audit.md)。
- 完整清单：[skills-baseline-inventory.json](./skills-baseline-inventory.json)。
- Agent 启动记录：**4 / 12**；追加修正记录：**3 / 6**（启动失败也保守计数）。按用户要求只保留 Codex/Cursor；Cursor 非交互认证已实测恢复，Claude 已退役且不再阻断。代码生成矩阵仍待继续。最新逐次状态以 [评测台账](./skills-agent-evaluations.json) 为准。
- Git 提交/推送/PR/部署：本轮均未执行。
- Commands 后续调整：直接维护 `.cursor/commands`；移除共享/Codex 镜像及同步操作，skills 仍共享。验证与新摘要见 [变更记录](./cursor-commands-change.md)；旧 Agent 结果不代表新摘要通过。

## 工作包

| 工作包 | 状态 | 证据/后续动作 |
| --- | --- | --- |
| 全仓迁移路径归类 | 已完成 | 1,326 个变更路径，逐项机器清单；非逐文件语义验收 |
| public API、图和测试入口核验 | 已完成 | 38 个 public API、50 个项目、116 条边、无循环；18 个项目及 11 项依赖任务通过 |
| 隔离启动条件核验 | 真实 PG/Redis/Auth 工厂已验证 | 专用随机端口容器和 Better Auth 测试身份；不使用开发容器或业务数据 |
| 用户确认迁移基线 | 已完成 | 用户明确确认 9546f88a93122d3db1251496188c80c89862b5f9；未替用户提交 |
| 外部 35 个 skills 来源与兼容性审查 | 已完成首次审查 | nx-generate 兼容小幅升级；3 个缺失来源补治理记录；不覆盖冲突项；见逐项报告 |
| 四个 ray-* skills 与 references | 已编写、结构验证通过 | 统一入口；所有业务读写经过用例；全端指引、Web/Desktop 深入 |
| 两 Agent 入口与旧规则协调 | 已本地验证 | 8 个本地 skill canonical 软链接；旧 Cursor 技能迁入 canonical，去除冲突和不安全示例 |
| 检查/准备更新/同步验证工具 | 已实现、确定性测试通过 | 只读检查与写入准备分离，固定版本，冲突失败；在线候选准备 0 新候选、27 暂缓 |
| 每周候选 PR 工作流 | 已编写、未启用 | 模板在 tools 下，不在 .github/workflows；未设置 schedule、未发布 PR |
| 确定性门禁与隔离 HTTP/WS 测试 | 基础场景本地通过 | Codex REST 独立 8/8、WS 独立 13/13；三种 REST 与两种 WS 变异全部被检出；慢网络背压仍未完成 |
| 两 Agent 行为评测 | 待继续、未完成 | Codex WS 自测 5/5；REST 首次自测受沙箱限制；Cursor headless 已恢复；已退役 Agent 的历史失败保留但不作为必选项 |
| 验收与维护说明 | 已交付 | skills-implementation-report.md 与 tools/skills-maintenance/README.md；明确区分本地通过与未完成的行为验收 |

## 首轮生成任务分配（按新范围调整，非全量通过）

1. Codex/Cursor：各新版 REST 和新版 WS，共 4 次（当前首轮场景共 10 项，原预算上限不扩大）。
2. Codex：旧版 REST 和旧版 WS，共 2 次。
3. Codex：旧版/新版混合 REST+WS，各 1 次。
4. Codex：新版 REST/WS 各重复 1 次。

每次执行前后记录任务编号、基线 SHA、技能摘要、模型/CLI、退出状态、实际测试及隐藏验收结果。候选内容变化使之前的候选评测证据失效。没有有效登录/额度时报告，不切换模型或购买额度。

## 本轮不处理的迁移问题

- 三个服务 package 所需源码 manifest 缺失；旧 Engine helper 保留。
- 现有 Pulse 的消息校验、撤权及分层缺口。
- 现有 E2E 的条件 skip 和路由前缀差异。
- Better Auth CLI 与 runtime 不同版本。

这些问题不应成为新技能的模板，也不得靠混入服务修复来使本次技能验收变绿。
