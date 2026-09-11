# billing-server

## 用途

Stripe Checkout/Portal/Webhook、RevenueCat Webhook 与 PG customer/subscription/order 持久化，包含 owner V2 开关与幂等处理。

## Tags、使用者与场景

`type:data-access` · `runtime:node` · `domain:billing`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Engine 计费用例与受控 Node 集成工具；不得由 Web/Native 直接导入。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/lib/env.ts 通过 envin 在 import 时读取进程变量，RevenueCat 实现也直接取 process.env；四个迁移 flag 有前置依赖校验。

| 变量                           | 含义                                         | 何时配置/默认                  | 值从哪里来                              |
| ------------------------------ | -------------------------------------------- | ------------------------------ | --------------------------------------- |
| `STRIPE_SECRET_KEY`            | 创建 Stripe Checkout/Portal 的服务端 API key | Stripe 路径需要                | Stripe Dashboard 测试/生产对应环境      |
| `STRIPE_WEBHOOK_SECRET`        | 验证 Stripe webhook 签名                     | 接收 Stripe webhook 时需要     | 具体 Webhook endpoint 的 signing secret |
| `REVENUECAT_API_KEY`           | 拉取订阅快照的 REST key                      | 同步 RevenueCat 时需要         | RevenueCat 后台服务端 API keys          |
| `REVENUECAT_WEBHOOK_SECRET`    | 校验 Authorization header                    | 接收 RevenueCat webhook 时需要 | 在 RevenueCat webhook 设置的秘密值      |
| `BILLING_OWNER_V2_DUAL_WRITE`  | 同时写 legacy reference 与 owner 列          | 默认 false                     | 迁移负责人在 Expand 后开启              |
| `BILLING_OWNER_V2_SHADOW_READ` | 对比新旧读取结果                             | 默认 false；要求 dual-write    | 迁移负责人                              |
| `BILLING_OWNER_V2_READ`        | 改用 V2 owner 读取                           | 默认 false；要求 shadow-read   | 回填/观察门禁通过后由迁移负责人开启     |
| `ORGANIZATION_BILLING_ENABLED` | 启用组织 Stripe 计费                         | 默认 false；要求 V2 read       | 发布负责人，不能客户端自行开启          |

依赖配置：[pg-dao](../../libs/pg-dao/README.md)、[billing-contract](../../libs/billing-contract/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

读取/配置定义：[src/lib/env.ts](src/lib/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project billing-server --json
pnpm nx run billing-server:lint
pnpm nx run billing-server:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run billing-server:test --run
```

mock Stripe/RevenueCat/Prisma，覆盖 claim、重复投递、失败重试、owner 归属与 flag 组合。实际 DB 原子竞争另外用隔离集成测试验证。

现有用例示例：[src/lib/billing-server.spec.ts](src/lib/billing-server.spec.ts)、[src/lib/persistence.spec.ts](src/lib/persistence.spec.ts)、[src/lib/env.spec.ts](src/lib/env.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
