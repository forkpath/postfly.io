# billing-client-web

## 用途

Web Billing 客户端项目预留。目前公开实现只有返回项目名称的占位函数，尚不是完整 Stripe UI/checkout adapter。

## Tags、使用者与场景

`type:data-access` · `runtime:web` · `domain:billing`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

计划供 Web/renderer 使用；现有真实 Web 计费请求在 api-client 和应用/Studio 中，不应把此库当完整支付能力。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project billing-client-web --json
pnpm nx run billing-client-web:lint
pnpm nx run billing-client-web:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run billing-client-web:test --run
```

当前占位测试不代表支付覆盖；新增真实行为时补 checkout/portal 请求、owner query key、拒绝/错误和重定向校验测试。

现有用例示例：[src/lib/billing-client-web.spec.ts](src/lib/billing-client-web.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
