# pg-dao

## 用途

Prisma 多 schema PostgreSQL 模型、迁移、生成客户端和 Nest PrismaService；包括认证/组织、计费和 Worker Inbox。

## Tags、使用者与场景

`type:data-access` · `runtime:node` · `domain:platform`。

Node persistence/auth-server/迁移工具；浏览器和 Native 禁止直接导入。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/env.ts 读取进程变量；prisma.config.ts 的 dotenv 读取与工作目录有关，建议根目录显式 wrapper。

| 变量                    | 含义                                   | 何时配置/默认        | 值从哪里来                                                  |
| ----------------------- | -------------------------------------- | -------------------- | ----------------------------------------------------------- |
| `POSTGRES_DATABASE_URL` | Prisma/pg 连接串（含主机、库名与认证） | 连接 PG 时必填       | 管理员提供或由本地 POSTGRES_HOST/PORT/USER/PASSWORD/DB 组合 |
| `POSGTRES_DATABASE_URL` | 旧拼写，只有新变量未设时回退           | 仅兼容；不要新增依赖 | 旧部署配置；非生产会告警                                    |
| `NODE_ENV`              | 运行模式 development/test/production   | 默认 development     | 运行命令/部署环境                                           |

读取/配置定义：[src/env.ts](src/env.ts)、[prisma.config.ts](prisma.config.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project pg-dao --json
pnpm nx run pg-dao:lint
pnpm nx run pg-dao:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

### 新项目初始化

`src/models` 定义完整模型，`src/migrations/20260921000000_init` 在空数据库中创建全部表与约束。从根目录配置 `.env` 后执行：

```sh
pnpm db:init
```

该入口先生成 Prisma Client，再执行初始化迁移。无需回填或额外的兼容步骤，重复运行不会重复建表。`generate` 只生成 Client，不修改数据库，也不调用认证检查。`db:seed` 先运行 auth-server 的演示账号/组织 seed，再运行 `pg-dao/src/seed.ts` 业务模板。它会写入数据，仅供需要演示数据的开发环境使用，不是初始化必需步骤。

业务模型变化使用 `pg-dao:migrate --name=<名称>` 创建标准迁移。`validate` 校验模型，`studio` 查看数据。`push` 仅用于原型开发，不能补建 Prisma 无法表达的 CHECK，因此不能替代初始化迁移。

Customer 使用 `userId` 或 `organizationId` 作为所有者。唯一约束与外键位于模型中，二者恰好一个有值的 CHECK 位于初始化 SQL。被 Customer 引用的用户/组织受到 Restrict 外键保护。

使用本脚手架建立业务后，应在版本控制中保留该业务自己的迁移历史。

## 单元测试：运行与编写

当前没有标准 `pg-dao:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

目前无标准 test；迁移测试不是单测。可为 PrismaService 生命周期添加 mock 测试，SQL/索引/事务用隔离 PG integration。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
