# Ray Skills 阶段零：迁移基线审计

审计日期：2026-09-11。后续状态：**2026-09-12 用户已明确确认候选基线**。

确认记录：用户回复“是的”，接受 `9546f88a93122d3db1251496188c80c89862b5f9`。
下文保留审计时的门禁与证据，历史 inventory 中 userConfirmed=false 不反写。
后续实施状态以 [skills-maintenance-tracker.md](./skills-maintenance-tracker.md) 为准。

## 1. 结论与确认点

本轮开始时 `arch` 工作区已干净，之前讨论的 699 项已跟踪变更和 85 项未跟踪条目不再是当前状态。迁移已进入下面两个提交：

| 提交 | 提交说明 | 审计说明 |
| --- | --- | --- |
| `17accd7` | refactor(libs): 解耦libs中的单个库被多个不同应用同时依赖 | 主要架构迁移 |
| `9546f88` | docs(ai): 更新ray的架构重构文档 | 不只是文档：还包含大量 pnpm-lock.yaml 变更 |

候选基线：`9546f88a93122d3db1251496188c80c89862b5f9`。

审计比较起点：`d58e0023e5babce482f9f0d8134b6edd41dc5d9c`，即主要迁移提交的父提交。比较范围包含上述两个提交；它不是生产版本差异，也不是全部历史迁移的正确性证明。

**需要用户明确确认该 SHA 可作为技能隔离评测基线。** 不需要为了本报告再次提交已有迁移；本报告及审计工具是本轮新增的本地文件，不属于该基线。没有替用户提交、推送、部署或创建 PR。

确认前未执行：技能升级、四技能改写、Agent 代码生成评测、容器启动、数据库迁移、自动维护工作流启用。18+11 项验证是现有源码的本地静态/单元检查，不是 Agent 生成任务；12+6 次评测预算尚未使用。

## 2. 全量变更分类

完整清单：[skills-baseline-inventory.json](./skills-baseline-inventory.json)。每个变更路径包含 Git 状态和分类；另有全部 50 个项目、38 个库的 public API 路径及 SHA-256、目标清单和 116 条内部依赖边。

| 分类 | 路径数 | 处理 |
| --- | ---: | --- |
| 迁移代码 | 937 | 保留；重点抽查 API/依赖/运行时相关内容 |
| 配置 | 268 | 保留；包括 targets、编译、依赖锁、部署配置 |
| 文档与 Agent 指令 | 105 | 保留；冲突项列入技能重构输入 |
| 生成产物 | 16 | 都位于受版本控制的 Prisma generated 目录；不自动删除或重生成 |
| 无法按路径分类 | 0 | 不表示逐文件业务语义或作者归属已经批准 |
| **合计** | **1,326** | 修改 386、新增 628、删除 312 |

这里禁用了 rename detection，重命名分别记为删除与新增；所以不能与此前按目录折叠的 85 个未跟踪条目直接比较。分类是路径级全量整理，不是对 1,326 个文件逐一作完整代码评审。

本轮没有清理文件。原先工作区改动已经提交；不能因目录名包含 generated 就删除 Git 中的数据库客户端，更不能删除无当前消费者的框架扩展点。

机器清单采集时工作区只有新建审计脚本这一项；采集前最初的 `git status --porcelain` 为空。清单写出后新增的本报告和台账不计入历史迁移数量。忽略目录、实际 `.env` 和本地凭据不扫描内容、不打包。

## 3. 项目与 public API 核验

### 当前图

- 50 个项目节点，包括根项目；38 个 `libs/*`。
- 116 条内部项目依赖，未发现循环。
- 38 个库的 `src/index.ts` 均存在；存在性和摘要不等同于导出能力完整。
- Web、Desktop、Mobile、Extension 的依赖闭包均未到达 `runtime:node` 项目。
- TypeScript aliases 已包含新 Auth/Billing/UI/Server 拆分项目；仍有显式的兼容子入口，如 `@libs/analytics/web` 和 `@libs/auth-server/nest`。不能把所有子入口一概当作非法深层导入。

### 重点复核结果

| 范围 | 结果与限制 |
| --- | --- |
| Auth contract/web/native/server | public API 和相关 lint/typecheck/test 通过；真实登录、会话与 Cookie 行为未在本轮启动验证 |
| Billing contract/server/native client | 相关检查通过；Web client 的现有测试仍是占位函数测试，不能称为 Web Billing SDK 已完成 |
| Payload/API client/Studio | 相关检查通过；客户端响应解包与服务端外层封装应在新 REST 测试中分别断言 |
| Platform contract/Redis/RabbitMQ/Server Nest | 核心检查通过；框架可选适配器不因无消费者而删除 |
| 服务内部四层 | 当前 customer Query Handler 仍直接调用 Repository；与本轮新定的“所有业务请求经 Use Case”不一致，不能作为新技能示范 |

项目边界与服务内部目录边界是两层验证。当前图的零循环、前端不触达 node，仅证明图中的项目关系；不能推导出 Controller/Domain/Application 内部所有导入都正确。

## 4. 本轮实际执行的验证

环境：Node 24.14.1、Nx 23.0.1、Vitest 4.0.16、Prisma/Client 7.8.0、Better Auth 1.6.26。后五项已核对本地安装版本与锁文件根 importer 解析版本一致；这不是全新环境 frozen install 证明。

执行命令：

```bash
CI=true NX_DAEMON=false NX_NO_CLOUD=true pnpm nx run-many \
  -t lint,typecheck,test \
  -p auth-contract,auth-client-web,auth-client-native,auth-server,billing-contract,billing-server,billing-client-native,payload,api-client,platform-contract,server-kernel,server-nest,server-redis,server-rabbitmq,engine,pulse,worker,studio \
  --skipNxCache --parallel=3 --outputStyle=static
```

结果：退出码 0；Nx 报告 18 个项目及 11 项依赖任务成功。缺少的 target 不会因 `run-many` 自动生成；目标存在性已经单独记录在清单中。

| 服务 | 测试文件 | 测试数量 | 测试层次 |
| --- | ---: | ---: | --- |
| Engine | 16 | 45 | 当前单元测试 |
| Pulse | 1 | 4 | FakeSocket、mock auth/Redis/Prisma |
| Worker | 2 | 7 | 当前消费者及 registry 单元测试 |

四个前端应用自身没有标准 `test` target；`web-e2e` 单独拥有 `e2e` target。这不否定共享库的单元测试，也不能被解读为四端已有完整应用测试。

测试日志包含预期的异常过滤器与 DLQ 错误日志，但任务通过。也出现 Nx Vite 插件弃用告警；本轮不自动升级插件或依赖。

额外校验包括审计脚本语法、完整路径集合和分类总数、public API 存在性、无覆盖保护，以及 `git diff --check`。审计报告不会把这些检查算成业务 E2E。

## 5. 隔离启动条件与问题分级

### G0：用户确认门禁——阻断生成评测

候选 SHA 尚未取得明确确认。确认后才允许从它构造评测副本；不能用旧分支或当前含本轮文件的工作区代替。

### G1：评测环境尚未建设——属于后续本轮交付

- Docker Server 29.2.1 可访问；本机有 PostgreSQL 17 和 Redis 镜像。仅检查可用性，没有启动或连接业务数据库。
- Codex、Claude、cursor-agent 可执行文件存在；未调用模型、未核验登录或额度，不代表三者能完成评测。
- 隔离 fixture 要有独立数据库、端口、数据卷和测试身份；必须显式注入测试环境，不加载原仓库 `.env`。
- 原 `docker-compose.dev.yml` 使用固定容器名、端口及持久卷，不能直接当作评测隔离环境。
- 完整 Engine AppModule 还加载 Mongo 和 RabbitMQ。只提供 PG/Redis 时，应由独立测试 composition root 组合所需模块，不能宣称完整 Engine 已启动。
- Better Auth 开启邮箱验证。隔离测试需可复现的已验证测试用户/邮件适配，不使用已有账号、默认种子口令或外部 OAuth 凭据。
- 首次在隔离副本进行 frozen dependency install 和真实 HTTP/WS 连接测试仍是必需门禁；本次本地安装测试不能替代它。

### R1：三个服务打包配置不完整——不在本轮修复

Engine/Pulse/Worker 均没有源码 `package.json`。解析后的 `package` target 依赖 `prune-lockfile` 和 `copy-workspace-modules`；本地 Nx 23.0.1 的两个 executor 均从 `<project.root>/package.json` 读取清单，而不是读取 Webpack 生成的 dist manifest。

证据：`services/*/webpack.config.js`、机器清单中的 resolved packaging targets、`node_modules/@nx/js/dist/src/executors/*` 的 `getPackageJson`。本轮未重新执行 package/build 或容器安装，所以这是当前配置与 executor 源码验证，不是新的打包运行结果。

处理：保留旧 Engine lockfile helper；生成评测使用隔离源码测试路径，不把部署 package 作为前置步骤。不得据此宣称正式镜像已可独立运行。

### R2：现有 Pulse 不足以成为新规范示例——后续整改

当前使用 `WsAdapter` + 原生 `ws`，不是 Socket.IO。Gateway 将 JSON 断言为类型，未做完整运行时 schema 校验；订阅后的广播使用连接保存的组织集合，缺少撤销成员资格后的明确更新策略。Gateway 还直接查询 Prisma 和发布 Redis。

现有 4 个 FakeSocket 测试及 `scripts/release/pulse-smoke-test.mjs` 不覆盖真实跨实例广播、撤权、完整重连与非法消息矩阵。新技能和隔离 fixture 必须约束并测试这些行为；不在本轮修改原 Gateway。

### R3：已有 E2E 的可执行性不足——不得充当新验收

`apps/web-e2e/src/platform-critical-flows.spec.ts` 含凭据缺失时 skip，部分业务请求使用 `/api/billing`、`/api/organizations`；Engine `main.ts` 配置的业务前缀为 `/api/v1`。新评测必须核实真实路由，缺环境时明确失败，不复用这些测试作为已通过证据。本轮没有执行这些 E2E。

### R4：Schema 工具版本与运行时不同——迁移治理待办

`tools/auth-schema/package.json` 固定 `@better-auth/cli` 1.4.21，而运行时 Better Auth 为 1.6.26。该问题单列，不在技能升级时改依赖。本轮未执行写入式 schema 生成、生产预检或数据库 migration。

## 6. 技能重构输入

| 现有来源 | 需要处理的内容 |
| --- | --- |
| `.agents/skills/ray-api-flow/SKILL.md` | 把运行时链路写成实现顺序；允许简单 Query 绕过用例；所有权字段过度统一；缺真实协议测试门禁 |
| `.cursor/skills/ray-module-dev/SKILL.md` | 过时的 domain/use-cases 测试目录；默认 queryRawUnsafe；类型断言绕过；分层与 feature-first 表述矛盾 |
| `.agents/commands/setup-saas-feature.md` | 协调实现顺序和新四技能职责；原 WS 示例位置不能代替 Pulse 实际边界；迁移命令需隔离前提 |
| `AGENTS.md` | 保留强制公共规则；纠正 service/workder、Nextjs worker、translationns 等导向错误；避免复制多份完整流程 |
| `scripts/sync-skills.sh` | 已存在真实目录或错误软链接时处理不安全；同步不是上游升级；后续单独建设冲突门禁 |

当前 `.agents/skills` 36 个技能、锁文件记录 32 个；除自定义 ray-api-flow 外，还有 3 个外部 skill 未在该锁文件登记。这里只检查本地登记，不代表完成外部源审查或升级。Ray API 技能未出现在 `.codex/.claude/.cursor` 的旧镜像目录；Codex 当前会话能够发现 `.agents/skills` 中的它，不能把缺旧镜像直接等同于所有 Agent 不可用。

## 7. 下一步与本轮文件边界

用户确认候选基线后，按原计划推进外部源审查、四技能重构、维护工具和隔离评测。服务整改 R1—R4 不夹带执行。

本轮只新增审计脚本、机器清单、本报告、实施台账；没有修改迁移代码、锁文件、数据库 schema 或既有技能。

使用技能：`skill-creator`、`nx-workspace`、`ray-api-flow`、`nx-run-tasks`。其中读取与保留既有约束、分层区分、通过 Nx 验证和不越过授权边界影响了本次审计方式。
