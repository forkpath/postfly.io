# api-core

## 用途

Axios 底层客户端：统一响应解包、鉴权 header 注入和类型化网络/业务错误。不含 React Query 领域逻辑。

## Tags、使用者与场景

`type:data-access` · `runtime:universal` · `domain:shared`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

api-client 和运行时兼容的调用方，在需要稳定 HTTP 契约时通过 createApiClient 使用。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本库不直接读环境变量；baseURL、timeout、auth/header 等通过 createApiClient options 注入。URL 来自宿主部署配置，token 由宿主会话机制提供，不能硬编码。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project api-core --json
pnpm nx run api-core:lint
pnpm nx run api-core:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run api-core:test --run
```

使用 Axios 测试 adapter，验证业务错误/HTTP 错误、响应解包、token header；不能真实请求用户服务。

现有用例示例：[src/lib/client.test.ts](src/lib/client.test.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
