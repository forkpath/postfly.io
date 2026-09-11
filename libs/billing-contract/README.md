# billing-contract

旧 billing 已退役；请使用 `@libs/billing-contract`。原工具测试迁入 [utils.spec.ts](src/lib/utils.spec.ts)，运行时 provider 与 env 的承接位置见[迁移说明](../../docs/development/legacy-cleanup.md)。

## 用途

BillingOwner、套餐/订单/订阅契约与公开 catalog 配置/工具。虽标 universal，当前仍含公开环境变量读取，不是严格的 env-free core。

## Tags、使用者与场景

`type:contract` · `runtime:universal` · `domain:billing`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

前端 UI、api-client、Node billing-server 等需要共同计费语义的消费者。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/lib/public-env.ts 先用 process.env[key]，否则 import.meta.env。模块初始化时取值；本库不加载文件。Native 动态读取不保证 Metro 内联，见边界检查指南。

| 变量                                                                                                                                                   | 含义                    | 何时配置/默认              | 值从哪里来                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------------------------- | ----------------------------------------------- |
| `VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY`                | 终身/月/年套餐 Price ID | 使用相应 Stripe 套餐时配置 | Stripe Dashboard 创建 Price 后取得；不是 secret |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY` | 终身/月/年套餐产品标识  | 使用相应移动套餐时配置     | App Store/Play 产品与 RevenueCat Catalog 映射   |

读取/配置定义：[src/lib/public-env.ts](src/lib/public-env.ts)、[src/lib/config.ts](src/lib/config.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project billing-contract --json
pnpm nx run billing-contract:lint
pnpm nx run billing-contract:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run billing-contract:test --run
```

覆盖 owner 联合类型对应的校验/转换、套餐查找、周期与格式边界；公开变量在 import 前 stub。

现有用例示例：[src/lib/billing-contract.spec.ts](src/lib/billing-contract.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
