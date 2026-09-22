# monitoring

## 用途

环境无关的监控策略注册、React Provider 接口与策略选择逻辑；不从核心入口导入 Sentry/PostHog SDK。

## Tags、使用者与场景

`type:platform` · `runtime:universal` · `domain:platform`。

跨端调用方需要公共接口时使用；实际 provider 从匹配 runtime 的 -web/-native/-server 选择。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project monitoring --json
pnpm nx run monitoring:lint
pnpm nx run monitoring:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run monitoring:test --run
```

mock adapter，验证 provider 注册、调用转发、缺 provider/重复初始化、错误行为；不能在 core 的单测里初始化真实 SDK。

现有用例示例：[src/lib/provider.spec.tsx](src/lib/provider.spec.tsx)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
