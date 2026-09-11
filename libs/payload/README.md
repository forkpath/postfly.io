# payload

## 用途

Zod HTTP 请求/响应 schema 与基础 payload 接口，覆盖 auth/admin/billing/organization/storage 等数据契约。

## Tags、使用者与场景

`type:contract` · `runtime:universal` · `domain:shared`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

api-client、Engine DTO 和兼容 runtime 的调用方；不依赖服务实例或数据库。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project payload --json
pnpm nx run payload:lint
pnpm nx run payload:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run payload:test --run
```

每个 schema 写有效/缺字段/错误类型/边界/未知字段测试；新增 endpoint 时客户端与 controller 同时消费同一个 schema。

现有用例示例：[src/schemas/billing/**tests**/billing.schema.spec.ts](src/schemas/billing/__tests__/billing.schema.spec.ts)、[src/schemas/admin/**tests**/users.schema.spec.ts](src/schemas/admin/__tests__/users.schema.spec.ts)、[src/schemas/admin/**tests**/organizations.schema.spec.ts](src/schemas/admin/__tests__/organizations.schema.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
