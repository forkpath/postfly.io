# auth-contract

## 用途

认证、Session/User/Organization、角色权限、校验 schema、错误信息及纯工具契约，避免前端依赖服务端 Prisma/Better Auth 实例。

## Tags、使用者与场景

`type:contract` · `runtime:universal` · `domain:auth`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

认证 web/native client、Node server 和需要认证类型/权限定义的合法消费者。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project auth-contract --json
pnpm nx run auth-contract:lint
pnpm nx run auth-contract:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run auth-contract:test --run
```

验证权限集合、schema 拒绝非法值、错误映射与安全默认值；类型通过 typecheck 验证。

现有用例示例：[src/lib/auth-contract.spec.ts](src/lib/auth-contract.spec.ts)。

旧 auth 工具测试已迁入 [utils.spec.ts](src/lib/utils.spec.ts)。使用 `@libs/auth-contract`，旧 `@libs/auth` 别名已退役；客户端 options 类型从 auth-client-web/native 获取。[迁移说明](../../docs/development/legacy-cleanup.md)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
