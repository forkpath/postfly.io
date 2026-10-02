# api-client

## 用途

在 api-core 上提供 React Query context、query/mutation 工厂与 auth/billing/organization/admin/storage 域请求封装；负责缓存 key 与客户端数据流。

## Tags、使用者与场景

`type:data-access` · `runtime:universal` · `domain:composition`。

Web、Desktop renderer、Mobile、Extension 和 SSR 调用方。使用 createClient/ApiClientProvider、domain queries；不直接读 PG。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本库不加载 .env；createClient 的显式 runtime/baseURL 参数优先。默认值分支读取 process.env，Web 默认同源空 baseURL；Native/扩展中推荐宿主静态取值后显式传参，避免动态 env/运行时检测误判。

| 变量                       | 含义                            | 何时配置/默认              | 值从哪里来                                    |
| -------------------------- | ------------------------------- | -------------------------- | --------------------------------------------- |
| `API_BASE_URL`             | SSR 默认 API 地址               | 默认 http://localhost:8000 | SSR 可达的 Engine 地址；显式 baseURL 参数优先 |
| `VITE_API_BASE_URL`        | Desktop/Extension 默认 API 地址 | 默认 http://localhost:8000 | 客户端可达 Engine 地址；显式 baseURL 参数优先 |
| `EXPO_PUBLIC_API_BASE_URL` | Mobile 默认 API 地址            | 默认 http://localhost:8000 | 手机可达 Engine 地址；推荐宿主静态读取后传参  |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project api-client --json
pnpm nx run api-client:lint
pnpm nx run api-client:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run api-client:test --run
```

mock ApiClient，验证 method/path/body、分页过滤、owner kind+ID 的 query key、账户切换缓存隔离与错误传播。

现有用例示例：[src/domains/**tests**/billing.spec.ts](src/domains/__tests__/billing.spec.ts)、[src/domains/admin/**tests**/customers.spec.ts](src/domains/admin/__tests__/customers.spec.ts)、[src/domains/admin/**tests**/organizations.spec.ts](src/domains/admin/__tests__/organizations.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
