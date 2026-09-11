# auth-client-web

## 用途

Better Auth React Web 客户端工厂，注册 Passkey/组织/匿名/2FA/Magic Link 等客户端插件和权限结果适配。

## Tags、使用者与场景

`type:data-access` · `runtime:web` · `domain:auth`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Web、Desktop renderer、Extension；创建客户端与展示权限 UI，但最终授权仍在后端。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

不直接读取 env；createClient(options) 从宿主接收 baseURL/fetchOptions。Studio 使用 VITE_API_ENDPOINT，Extension 使用 VITE_API_BASE_URL。来源是认证服务外部地址；禁止注入 BETTER_AUTH_SECRET。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project auth-client-web --json
pnpm nx run auth-client-web:lint
pnpm nx run auth-client-web:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run auth-client-web:test --run
```

当前测试重点是 permission result envelope；新增插件交互、错误时默认拒绝、会话缓存和请求参数测试，真实 OAuth/Passkey 放 E2E。

现有用例示例：[src/lib/auth-client-web.spec.ts](src/lib/auth-client-web.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
