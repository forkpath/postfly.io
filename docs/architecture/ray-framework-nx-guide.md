# Ray 框架开发指南：Nx、CI/CD 与可选能力

本指南基于 2026-09-08 的当前工作树。它解释“开发者为什么要这样用”，配置与调用关系以仓库文件为准。自动生成的项目图见 [迁移复核报告](ray-nx-migration-review.html)，本次实际验证见 [验证记录](ray-framework-restore-validation.md)。历史测试成绩不能自动代表后续修改后的状态。

## 1. 先明确 Ray 是框架

Ray 的目标是让后续业务快速接入成熟能力。评价一次拆分，要看接入成本、职责清晰度、测试替换能力和故障可诊断性。项目更少、当前应用依赖更少，只是局部指标。

之前因为没有当前业务消费者就删掉 Elasticsearch、SMS，是把“框架预留能力”当作“业务死代码”处理了。这个判断已经纠正：没有消费者可以意味着尚未启用；要删除一个能力，应证明它已废弃，或有覆盖完整契约的迁移方案。

框架能力遵循三个条件：有明确公共入口；显式注册后才启用；配置错误和提供方错误能被测试并清楚报告。默认启动 Ray 不要求配置所有云服务。

| 能力 | 当前归属 | 怎么启用 | 原删除判断的修正 |
| --- | --- | --- | --- |
| Elasticsearch | `@libs/server-elasticsearch` | 在 Nest 模块导入 `ElasticsearchModule.register()`，提供 `elasticsearch` 配置 | 恢复搜索服务接入能力；业务自行定义索引和查询 |
| SMS | `@libs/server-sms` | 导入 `SmsModule.register()`，提供 `sms` 配置 | 恢复阿里云短信；模板、签名、限流由业务接入时确定 |
| Email | `@libs/email/server` + `@libs/server-email` | 模板邮件调用 `sendEmail`；Nest 原始邮件调用 `EmailService.send` | 原始正文与模板参数是两份契约，旧 wrapper 的注入不匹配已修正 |
| Storage | `@libs/server-storage` | 导入 `StorageModule.register()`，显式选 `aws-s3` 或 `aliyun-oss` | 恢复完整对象操作；Engine 的签名 URL 服务不等价于此通用能力 |

`server-storage` 保留对象上传、下载、复制、单个/批量删除、列举、目录删除及上传策略能力。列表处理分页，S3 批量删除按批次执行并报告部分失败，OSS 删除异常向调用者传播。目录删除拒绝空前缀和根前缀。

兼容边界也要讲清楚：旧 storage 默认选 OSS，新模块要求显式 provider；OSS `getPolicy` 是 POST 表单策略，S3 的同名方法是签名 PUT URL，不能用同一种客户端上传流程解释它们。旧 S3 `putObject` 未消费 OSS 专属 options，这项差异仍存在；它不是一个完全统一所有厂商语义的存储抽象。

这些恢复模块没有自动加入 Engine/Pulse/Worker 的 AppModule。它们是已实现、可选择启用的框架能力。真实云端的索引、短信发送、邮件投递和对象存储集成仍需沙箱验证。

## 2. Nx 到底负责什么

可以从一个命令理解：`pnpm nx run engine:test`。

`engine` 是项目，`test` 是它的一项任务（target）。Nx 先读取合并后的项目配置，再启动底层 Vitest。Nx 还知道哪些项目相互依赖，因此能够安排执行顺序、选择受影响项目、判断能否复用之前的结果。Vitest 才负责运行断言。

项目图回答“谁依赖谁”；任务图回答“这次命令需要按什么顺序运行哪些任务”。例如 Engine 的 `package` 先等 `build`，再完成锁文件裁剪和 workspace 模块复制。`package` 本身是聚合任务，不是另一个编译器。

`project.json` 只是一部分配置。ESLint/Vitest/Webpack 等 Nx 插件还能推断 targets，`nx.json` 提供全局默认值。排查时先看 `pnpm nx show project engine --json`，它才是合并后的实际执行配置。

## 3. Type / Runtime / Domain 与 Scope

它们都是 Nx `tags` 中的字符串。Nx 支持自定义 tags；`scope:*` 也是团队约定，不是必须存在的默认分类。当前仓库采用三个维度，是为了让三个问题各有明确答案。

| 标签 | 问题 | 例子 |
| --- | --- | --- |
| `type:*` | 代码做哪一层的事情？ | `contract` 是契约；`ui` 是界面；`platform` 是基础设施适配；`app` 是应用组合根 |
| `runtime:*` | 在什么环境中可以运行？ | `node`、`web`、`native`、`universal` |
| `domain:*` | 哪个领域拥有它？ | `auth`、`billing`、`shared`、`platform`、`composition` |

例如 `server-sms` 是 `type:platform + runtime:node + domain:platform`：它是后端基础设施能力，不应让 Web 页面直接导入。`billing-contract` 是 `type:contract + runtime:universal + domain:billing`：前后端可以共同使用它的类型和约定。

规则在根 `eslint.config.mjs`。多个维度同时命中时，都需要满足；同一条 `onlyDependOnLibsWithTags` 中列出的值是可选范围。例如 Web UI 依赖 Native UI 会触犯运行时规则，契约库依赖数据库会触犯职责规则。

Tag 本身不会神奇地提高缓存命中率，也不会自动拆分 CI，更不承担用户/组织运行时授权。它主要用于代码依赖规则与筛选，例如：

```sh
pnpm nx show projects --projects='tag:runtime:node'
pnpm nx run-many -t lint --projects='tag:domain:billing'
```

真正影响 affected 的是依赖图和文件变更；真正影响缓存的是任务输入与输出。清晰的标签帮助阻止错误依赖，清晰的依赖再帮助 Nx 缩小影响面。把库标签改成 universal，并不能使其 Node-only SDK 变成浏览器兼容代码。

2026-09-10 已完成 email/analytics/monitoring 的运行时细化：email 保留通用契约，email-server 持有模板渲染和发送；analytics/monitoring 保留不读取环境变量的核心，各自新增 web/native/server 项目。Web 项目涵盖 Web、Desktop renderer 和 Extension 三个明确入口；环境配置从对应运行时的 `/env` 入口读取，不再从 universal 根入口聚合导出。旧的明确平台别名映射到真实项目，无法绕过 Node 导入限制。原因、兼容变化与验证详见 [运行时细化说明](runtime-refinement.md)。

当前规则还有务实的宽松处：data-access 可以依赖 data-access，platform 可以依赖 data-access/UI，Billing 域可依赖 Auth 域；它没有逐项实现最初方案中更严格的“Billing 只能使用 Auth contract”。后续收紧应基于真实调用链，不能把标签表当成已经完成所有安全隔离的证明。

官方说明：[模块边界](https://nx.dev/docs/features/enforce-module-boundaries)、[多维标签](https://nx.dev/docs/guides/enforce-module-boundaries/tag-multiple-dimensions)。

## 4. GitHub Actions、Nx 与 Nx Cloud 是怎么配合的

| 组件 | 可以把它理解为 | 在 Ray 中具体做什么 |
| --- | --- | --- |
| GitHub Actions | 提交代码后启动流程的执行平台 | 响应 PR/push/tag，准备 runner，安装 Node/pnpm，管理 Secrets，启动测试和镜像发布 |
| Nx CLI | 懂这个仓库依赖关系的任务调度器 | 选择 affected 项目、安排 task graph、计算缓存键、执行底层工具 |
| Nx Cloud | 团队共享的任务结果与 CI 协作服务 | 远程缓存、任务日志；额外配置后可用 Agents 分布式执行等能力 |
| Docker/GHCR/部署主机 | 交付与运行系统的设施 | 镜像构建和保存、按 digest 拉取、探针与切流 |

一次 PR 的典型路径是：GitHub 收到 PR → GitHub runner 安装依赖 → runner 执行 Nx → Nx 选择受影响任务 → 查询本地或 Nx Cloud 缓存 → 命中则恢复产物和日志，未命中才运行编译/测试 → GitHub 展示结果。购买 Nx Cloud 并不会替代 GitHub 的触发器、部署凭据、服务器或生产数据库。

Nx Cloud 的 Agents 是另一项能力：把任务分配到多台机器。当前 CI 没有 `start-ci-run --distribute-on` 一类分布式启动配置，所以当前的购买和连接不能解释为“现在已分布式构建”。本地 `--parallel=4` 只是同一台机器最多并行四项任务。

当前仓库有 `nxCloudId`，CI 引用 `NX_CLOUD_ACCESS_TOKEN`。本次只验证了仓库接线，未读取你账户的付费套餐、Secret 实际值或近期 Cloud 任务，因此不把它描述成已实测远程命中。

如何知道购买的 Cloud 是否产生效果：打开某次 GitHub CI 的 `Upload Nx CI metrics` 产物，查看 `remoteCacheHits` 和 `remoteCacheHitRate`；再在 Nx Cloud 对应 workspace 查看任务的 cache hit / executed 记录。两个相同输入的成功运行可对比复用情况，但只有 `remote-cache-hit` 才能证明用了远程缓存。相同 SHA 不保证相同环境变量，也就不保证相同 hash。

注意区分三种缓存：`setup-node cache: pnpm` 缓存包管理器下载内容，减少依赖下载；Nx 缓存已完成任务的产物和日志；Docker layer cache 复用镜像层。三者各解决一段耗时，不能互相替代。

官方说明：[GitHub Actions 的 workflow/job/runner](https://docs.github.com/en/actions/get-started/understand-github-actions)、[Nx 远程缓存](https://nx.dev/docs/features/ci-features/remote-cache)、[Nx Agents](https://nx.dev/docs/features/ci-features/distribute-task-execution)。

## 5. 为什么要 affected，为什么缓存要配置输入

假设只改 `server-sms` 的发送错误处理，它没有应用消费者，那么受影响检查主要落在该库；没理由把所有手机界面都重新构建。反过来，修改 `payload` 的接口校验，依赖它的 API client、页面和 Engine 都可能受影响。

affected 先回答“哪些项目需要检查”；缓存随后回答“这些任务的相同输入是否已经成功检查过”。任务虽然在受影响集合里，也可以命中缓存。

`inputs` 包含代码、上游代码、编译配置、锁文件与影响产物的环境变量；`outputs` 描述要保存和恢复的产物位置。`^production` 中的 `^` 表示依赖项目的 production 输入。漏掉 `VITE_API_BASE_URL`，就可能把指向旧 API 的 Web bundle 当成可复用结果；漏声明产物目录，就可能出现日志显示成功而部署文件没恢复。

当前根 `sharedGlobals` 包含 package/lockfile/TS/Nx/ESLint/CI 配置以及 Node 版本、操作系统和 CPU 架构。这是一种偏保守的正确性选择：修改全局配置可能让很多任务失去缓存。先确保没有错误复用，再用运行数据优化输入范围。

允许缓存的是确定性 lint、typecheck、单元测试、构建和 Prisma client 生成。发短信、投递邮件、签名、发布镜像、数据库迁移等外部操作不能因为“以前成功过”就跳过，所以执行任务禁缓存。使用 mock 的单元测试不会真的发送短信，可以缓存。

## 6. 当前 CI/CD 什么时候运行

下表来自 `.github/workflows/ci.yml`、`ci-baseline.yml`、`deploy.yml`，是当前配置行为。

| 事件 | 做哪些事情 | 开发者需要知道的细节 |
| --- | --- | --- |
| 向 dev/main 提 PR，或 push dev | SHA action 成功时执行 affected lint/typecheck/test/build | 基线配置为 dev；PR 指向 main 并不自动变成全量 |
| push main、v* tag、每日定时 | 全量四项任务、服务 package 与 Web E2E | E2E 中带凭据的业务用例仍可能跳过 |
| SHA action 失败 | 全量四项任务与 package | 此分支没有自动增加 Web E2E |
| 任意常规 CI | 指标工具、缓存契约、auth/schema、容器检查；独立 PG job | PG job 建临时数据库并测空库/历史升级；不接触生产库 |
| 手动 CI workflow | 按 ref 和 SHA action outcome 走上述分支 | 若有 baseline 数值，可额外做性能审计 |
| 手动 baseline workflow | 同一个 SHA，五个独立 runner 全量禁 Nx 缓存 | 采样基准，不是日常每个 PR 都跑五次 |
| 发布 v* tag | 校验 tag commit 属于 main 历史，验证、构建镜像、推 GHCR、部署 | CI 和 deploy 是两个 workflow；deploy 自己重复部分验证，不自动等待 CI workflow 的每个 job |

Fork PR 不获得仓库 Cloud Secret，并配置为不用远程缓存。内部 PR 的读写还取决于实际 Secret 与 Cloud 权限，不是仅靠 YAML 就能证明。

先前报告说“SHA 或 Nx Cloud 不可用就全量执行”不够准确：当前仅有 SHA action 失败的全量分支。`run-nx-with-metrics.mjs` 保存结果并传递退出码，没有自己实现 Cloud 故障识别/禁云重跑。Cloud 客户端自己的容错行为不能冒充仓库有明确 fallback。需要排除 Cloud 影响时，可设置 `NX_NO_CLOUD=true`，再手动运行全量 `--skipNxCache`；这也不保证底层构建无需下载外部资源。

发布流程按 Git SHA 标记镜像，部署使用 digest 锁定不可变内容；migrator 先核对迁移类别，应用通过探针后切流。快速回退使用旧 digest，数据库 expand 变更保留。Contract Migration 有独立前提，不能作为普通蓝绿切流的顺带步骤。

性能审计设定中位耗时改善 40%、缓存命中率 70% 等门槛，是目标和检查条件。只有足量、相同口径的运行证据才能宣告达标；本地一次成功不能证明这些指标。

## 7. Tools：被谁在什么时候使用

这里的 tools 不都是真正的 pnpm 包，也不都是运行时依赖。

| 目录 | 谁调用 / 何时调用 | 入口与输出 | 解决的问题 |
| --- | --- | --- | --- |
| `tools/auth-schema` | 开发者/CI 执行 auth-server:schema-check；PG generate 的前置检查也调用 | checker 在临时目录运行该包中的 CLI，比较候选 schema，然后删除临时文件 | 防止认证插件变动后表字段不匹配；禁止直接覆盖受控 schema |
| `tools/migrator` | 镜像 CI 构建 migrator；部署控制器启动一次性容器 | Dockerfile 安装固定 Prisma，entrypoint 校验策略后执行迁移 | 让迁移工具、SQL 和版本随发布走，不在主机临时下载 CLI |
| `tools/migration-tests` | PG 历史升级脚本间接调用，或开发者在隔离 DB 中单独运行 | `pnpm nx run migration-tests:billing-application-compatibility` | 检验应用在旧列/新列阶段能否正确读写，不只是 SQL 能执行 |
| `tools/ai-migrations` | 升级 Nx/Vite/Vitest 的维护者阅读 | Markdown 升级说明，没有业务 target | 保存迁移注意事项；普通开发和生产不执行 |

当前精确版本事实：`tools/auth-schema` 固定 CLI **1.4.21**，根 Better Auth runtime 是 **1.6.26**，并非最初计划中的同版本。checker 读取当前 auth-server 配置，但比较逻辑还主动忽略物理映射；它不能证明全面物理契约治理已经完成。这是需要单独治理的差异，本文不会把“有一个检查”说成“全部升级要求已完成”。`tools/migrator` 固定 Prisma **7.8.0**。

## 8. Scripts：按一次开发/发布的时间顺序理解

普通业务开发者只需记住少量 `pnpm`/`nx` 入口。其余脚本主要由 CI 或发布控制器调用，不要求开发者每天手工执行。

| 时间 / 使用者 | 脚本 | 谁触发 / 输入 | 输出、作用与注意事项 |
| --- | --- | --- | --- |
| 共享 skill 变更 / 开发者 | `sync-skills.sh` | `pnpm sync:skills` | 仅同步 Codex/Cursor 的 skills；commands 直接在 `.cursor/commands` 维护；不部署代码 |
| 本地环境维护 / 开发者 | `clean.mjs` | `pnpm clean:dry-run` 预览；`pnpm clean` 才清理 | 会删除依赖/缓存/产物，需要重新安装；不是每次提交前步骤 |
| 认证/数据库修改 / CI、开发者 | `auth/check-auth-schema.mjs` | `pnpm nx run auth-server:schema-check` | 临时生成候选，打印漂移，失败退出；不覆盖 auth.prisma |
| PR/full CI / runner | `ci/run-nx-with-metrics.mjs` | workflow 传入 Nx 命令、phase 和运行身份 | 收集时长、cacheStatus、SHA 等到 `artifacts/ci-metrics`；原任务失败仍失败 |
| CI 启动前 / runner | `ci/check-nx-cache-contracts.mjs` | `pnpm ci:nx-cache-contracts` | 检查输入、项目边界、Action pin 与副作用禁缓存；不是测性能的脚本 |
| CI / runner | `ci/server-boundaries.test.mjs`、`nx-baseline.test.mjs` | `pnpm ci:metrics:test` | Node 内建测试器执行治理断言；不使用 Vitest、不发业务请求 |
| 发布定义变化 / CI | `ci/check-container-contracts.sh` | `pnpm ci:container-contracts`；完整产物检查另带 `--require-artifacts` | 检查 Dockerfile/Compose 与 mock 发布回退；它不是把整套服务部署到线上 |
| 五次基准结束 / baseline job | `ci/summarize-nx-baseline.mjs` + `nx-baseline.mjs` | 五个样本 JSON | 检验同 SHA、独立样本、无缓存后输出中位数；`nx-baseline.mjs` 是被 import 的计算模块 |
| 定时性能审计 / metrics-audit job | `ci/evaluate-nx-metrics.mjs` | 历史指标目录、baseline 数值、样本/改善率条件 | 输出是否满足门槛；没有 baseline 条件时 workflow 不启动这一 job |
| 数据迁移前 / 维护者 | `migrations/preflight.sql`、`preflight-billing-owner-v2.sql` | 对目标数据库显式执行只读 SQL | 报告重复、归属、回填等问题；不是自动修数据 |
| 数据演进 / 维护者 | `migrations/backfill-billing-owner.ts` | `pnpm nx run pg-dao:backfill-billing-owner`，指定 DB 与脚本所需开关 | 分批写数据、记录进度；不能当作日常单测 |
| expand 发布 / migrator | `migrations/sql/expand-concurrent-indexes.sql` | migrator entrypoint | 创建并发索引，与普通事务迁移的职责分开 |
| contract 发布 / 维护者 | `migrations/sql/billing-owner-v2-contract.sql` | 单独审查门禁后手动迁移 | 删除旧契约；不会由普通蓝绿部署自动执行 |
| 每次 DB CI / PG job | `verify-fresh-database.sh`、`verify-historical-upgrade.sh` | 空的、可丢弃的 PostgreSQL 数据库 | 测空库与历史升级/回填；检测到非空库会拒绝相应测试 |
| 历史兼容检查 / 上述测试脚本 | `verify-billing-application-compatibility.sh` | Nx migration-tests target | 用受控环境启动兼容性测试代码，与 PG SQL 检查配合 |
| 镜像启动 / migrator | `release/migrator-entrypoint.sh` | release class、不可变镜像、目标 DB | 先调用策略检查，再按类别执行 Prisma；有真实 DB 副作用 |
| 发布前 / CI 与 migrator | `release/check-migration-policy.mjs` + `migration-policy.mjs` | migration 清单、checksum、模式 | 拒绝不允许的迁移类别；后者是内部逻辑模块 |
| 发布/回退 / deploy job、运维 | `release/deploy-blue-green.sh` | 镜像 digest、服务器配置、当前颜色、操作人 | 探针→候选启动→切流→观察→失败回退，写 release manifest；作用于真实主机 |
| 切流前后 / 发布控制器 | `release/smoke-test.mjs`、`pulse-smoke-test.mjs` | 服务地址、专用 smoke 账号/组织 | 检查关键认证/计费/连接行为；不是普通用户随便运行的线上测试 |
| 发布脚本改动 / 容器契约检查 | `release/test-deploy-controller.sh`、`test-migrator-entrypoint.sh`、`migration-policy.test.mjs` | `fixtures/bin` 和 `fixtures/migrator-bin` 中的假 docker/curl/psql 等 | 验证失败路径、回退顺序和守卫，不执行真正切流 |
| 运维入口 / 维护者 | `scripts/deploy.sh` | help / rollback / finalize | 旧的 git pull 现场构建入口已关闭；仅保留说明与应急转发 |
| 服务打包 | `engine:package`（Pulse/Worker 同理） | 2026-09-10 实测失败 | prune/copy executor 要求源码 package.json，当前没有；旧 create-engine-lockfile.js 尚不能删除，详见 [清理台账](../development/legacy-cleanup.md) |
| 架构发生变化 / 文档维护者 | `ci/generate-nx-migration-review.mjs` | `pnpm docs:nx-migration-review` | 读取当前 Nx 图生成 HTML；生成报告不等于重新运行测试 |

fixtures 下的同名 `docker`、`curl`、`node`、`pnpm`、`psql` 是测试替身，只在测试脚本临时构造的 PATH 中使用。它们不会替换开发机全局程序。

## 9. 现在每个 app/service 都使用 Vitest 吗

不是。当前三个服务的标准 `test` 都由 Vitest 执行；四个产品 app 尚没有各自的标准单元测试 target。不能把“仓库使用 Vitest”写成“每个项目都有单测”。

| 项目 | 标准单测 | E2E / 集成 | 当前解释 |
| --- | --- | --- | --- |
| Engine | Vitest | 部分 API 业务脚本、DB 兼容测试 | 单测主要验证领域、应用层与控制器；不是完整真实依赖环境 |
| Pulse | Vitest | 独立发布 smoke | 单测使用替身验证鉴权/组织访问；多实例 Redis 行为需集成环境 |
| Worker | Vitest | 需 RabbitMQ/PG 集成测试补强 | 单测覆盖重复消息/重试/DLQ；不能替代 broker 真实投递测试 |
| Web | 无独立 test | `web-e2e:e2e` 使用 Playwright | 生产 bundle 的三个浏览器 smoke 可跑；业务用例依赖隔离凭据 |
| Desktop | 无独立 test | 无独立完整 E2E | 编译通过并不证明 Electron IPC/安装包行为 |
| Mobile | 无独立 test | 无独立完整 E2E | Expo export 不等于真机运行和支付集成通过 |
| Extension | 无独立 test | 无独立完整 E2E | Chrome/Firefox bundle 成功不等于消息链路和权限正确 |
| 四个恢复的 server adapter | Vitest | 真实提供方 sandbox 另测 | 以无网络测试验证接线、参数、错误和分页等契约 |
| 仓库 CI/发布脚本 | Node test + Shell 测试 | Dockerfile/Compose 检查 | 它们不是应用单测，使用合适工具即可 |

`nx run-many -t test` 会跳过没有 test target 的项目，不会自动提示“业务测试缺失”。CI 仍然有价值：类型、静态边界、现有断言、构建、schema/迁移、发布契约分别防止不同错误；但覆盖空白需要开发真实测试代码才能填上。

后续不必强制所有技术栈使用同一种测试器。Web/服务共享 TS 逻辑很适合 Vitest；Native 可按 Expo/React Native 生态选择测试方案，Electron/扩展需对应运行环境。统一的是 `lint/typecheck/test/build/package/release` 的任务含义、可执行测试、失败会阻断交付，而不是让所有 target 都叫 Vitest。

## 10. 后续开发者的最短路径

1. 普通业务开发先看 setup-saas-feature 指南，按 payload/API client/应用层/领域/仓储链路实现业务。工具脚本不必逐个阅读。
2. 要搜索、短信、邮件或对象存储时，阅读对应 server-* README，在自己的 Nest 模块显式导入并提供配置。通用 adapter 不拥有业务权限；组织/用户归属由业务层决定。
3. 修改完成后跑项目的 `lint/typecheck/test`；提交前用 affected 校验真实消费者。缺测试的 app 应补真实场景，而不是添加空测试制造绿灯。
4. PR 交给 GitHub Actions，Nx 选择任务，Nx Cloud 复用结果。看失败任务和实际远程命中证据定位问题。
5. 涉及生产 DB 或发布时进入独立迁移/发布流程，由可重复脚本执行并留下证据。

保留框架能力、减少隐式行为、让测试容易替换外部依赖、让新人能从一个入口找到正确用法，才是这轮 Nx 改造应持续遵循的标准。
