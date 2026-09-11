# 数据库迁移脚本 · 预检、回填、兼容演练

## 用途、分类与使用者

脚本自身不是 Nx 项目；语义 type:platform/runtime:node/domain:platform。SQL 由 PostgreSQL 执行，shell/TS 在维护机运行。供迁移维护者与隔离 CI，不能让应用或普通开发命令自动执行生产写入。

全部命令从根运行，使用 POSTGRES_DATABASE_URL（由管理员提供的明确目标库连接串），普通脚本不自动加载根 .env。可使用 pnpm exec dotenv -e .env.local-test -- 加载明确的测试配置。先确认数据库身份、备份/恢复记录、迁移台账，再选择动作；本 README 不授权对生产执行。

## 脚本逐项说明

| 文件                                               | 如何运行                                                                                | 功能、输出与副作用                                                                                                    |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| preflight.sql                                      | psql "$POSTGRES_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/migrations/preflight.sql | 只读预检会员/角色重复、billing owner、Account/provider、webhook、表/索引/事务情况；输出可能含业务标识，报告访问需受控 |
| preflight-billing-owner-v2.sql                     | 同上，将文件名换成本文件                                                                | 只读 V2 owner/索引等门禁；要求相应 schema 已存在，不能在未 Expand 时假定能运行                                        |
| backfill-billing-owner.ts                          | pnpm nx run pg-dao:backfill-billing-owner -- --batch-size=500                           | 默认 dry-run 扫描；--apply 才分批写 userId；未知 owner/冲突输出隔离报告并退出2                                        |
| verify-fresh-database.sh                           | pnpm nx run pg-dao:migration-test                                                       | 必须空、可丢弃 DB；执行全部 migration、两次在线索引、预检和重试验证；真实 DDL/DML                                     |
| verify-historical-upgrade.sh                       | pnpm nx run pg-dao:historical-migration-test                                            | 必须空、可丢弃 DB；建历史 schema/夹具、验证冲突拒绝/人工处理后的重试、兼容模式及回填恢复；会删除测试冲突行            |
| verify-billing-application-compatibility.sh        | pnpm nx run migration-tests:billing-application-compatibility                           | 逐阶段启动 TS runner；先有历史夹具，不能对任意空库直接跑；改测试 Customer 数据                                        |
| [sql/expand-concurrent-indexes.sql](sql/README.md) | 由 fresh/history/migrator 入口调用                                                      | 非事务并发索引；可清理同权限重复行/指定失效索引，不是只读                                                             |
| [sql/billing-owner-v2-contract.sql](sql/README.md) | 单独批准的 Contract runbook                                                             | 验证约束、删除 legacy 列，旧应用不可回退；不属于普通 deploy                                                           |
| [fixtures/pre-expand-data.sql](fixtures/README.md) | history runner 调用                                                                     | 固定测试用户/组织/重复权限/计费历史行，仅测试 DB                                                                      |

## 回填参数与恢复

--batch-size 为 1–5000，默认500；--cursor=<最后成功批次ID> 可继续；--report=<文件> 默认 artifacts/migrations/billing-owner-quarantine.jsonl。cursor 写在批次日志，需要操作者保存，不存在自动可靠的外部 checkpoint 服务。

默认不写 Customer，但遇到归属不明仍会写隔离报告。--apply 逐批事务提交，中途失败前已提交批次不会自动回滚；重复执行只筛选空 owner。报告中的归属必须人工处理，不能猜测为某组织。此前 dry-run 通过不保证后续并发数据不会变化。

## 配置来源与前提

需要 Node/pnpm、已安装 workspace、已生成 Prisma client、psql 和受控测试 URL。history 可选择 POSTGRES_CLIENT_CONTAINER（已存在的测试容器）、POSTGRES_CLIENT_DATABASE_URL（容器内 URL）、POSTGRES_CLIENT_WORKDIR（容器内根路径）；这些由测试环境提供，不是生产配置。

compatibility wrapper 自动设置四个 Billing flags，各阶段使用新进程；不会修改部署配置。只使用测试环境 Stripe/RevenueCat 替身，真实支付与数据库迁移不是同一个验收项。

## 测试如何写

迁移 SQL 的正确性靠真实隔离 PG，不用 mock 冒充锁/索引/事务语义。新增 fixture 覆盖旧行、空值、冲突、失败重试；history 脚本断言 migration ledger、索引有效、权限未误合并和可恢复回填。增加 CLI 参数解析单测时应先隔离 DB 副作用，再用 Node/Vitest 测纯解析。

详细审批和不可逆边界见 [Billing runbook](../../docs/migrations/billing-owner-v2-runbook.md)、[迁移总览](../../docs/migrations/README.md)。禁止缓存迁移、回填、reset、push、seed。
