# platform-contract

## 用途

版本化 EventEnvelopeV1、smoke payload、exchange/routing 常量和校验；只提供平台事件能力，不虚构产品业务事件。

## Tags、使用者与场景

`type:contract` · `runtime:universal` · `domain:platform`。

Engine 发布者、Pulse/Worker 与其他合法消费者；新增业务事件先定义版本/actor/payload。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project platform-contract --json
pnpm nx run platform-contract:lint
pnpm nx run platform-contract:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run platform-contract:test --run
```

覆盖非法/未知版本、缺 id/correlationId/actor、payload 校验和有效 envelope；不能静默接受未知版本。

现有用例示例：[src/lib/platform-contract.spec.ts](src/lib/platform-contract.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
