# migration-tests

## 用途

Billing 应用对历史/Expand 数据库的兼容性测试 runner，依次验证 legacy、dual-write、shadow-read、V2-read、organization 阶段。

## Tags、使用者与场景

`type:app` · `runtime:node` · `domain:composition`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

数据库迁移维护者/CI，仅可丢弃且已经准备好的测试数据库。它会创建/修改测试数据，不能对生产运行。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

进程中 POSTGRES_DATABASE_URL 指向隔离数据库；wrapper 为每个阶段启动新进程并设置四个 Billing flags。必要的导入配置使用测试值，不能自动借用生产凭据。

| 变量                    | 含义                                   | 何时配置/默认        | 值从哪里来                                                  |
| ----------------------- | -------------------------------------- | -------------------- | ----------------------------------------------------------- |
| `POSTGRES_DATABASE_URL` | Prisma/pg 连接串（含主机、库名与认证） | 连接 PG 时必填       | 管理员提供或由本地 POSTGRES_HOST/PORT/USER/PASSWORD/DB 组合 |
| `POSGTRES_DATABASE_URL` | 旧拼写，只有新变量未设时回退           | 仅兼容；不要新增依赖 | 旧部署配置；非生产会告警                                    |
| `NODE_ENV`              | 运行模式 development/test/production   | 默认 development     | 运行命令/部署环境                                           |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project migration-tests --json
pnpm nx run migration-tests:billing-application-compatibility
pnpm nx run migration-tests:lint
pnpm nx run migration-tests:typecheck
```

推荐从 `pnpm nx run pg-dao:historical-migration-test` 进入完整历史升级夹具流程；这需要空隔离 DB。单独 compatibility target 不会替你初始化历史数据，详见 [迁移手册](../../scripts/migrations/README.md)。

## 单元测试：运行与编写

当前没有标准 `migration-tests:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

该目标是有 DB 写入的集成测试，非单测且不可缓存。补测试时新增成功/拒绝/重复/回填场景和清理，先检查 src/billing-application-compatibility.ts 的固定 fixture ID。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
