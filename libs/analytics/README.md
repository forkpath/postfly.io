# analytics

## 用途

环境无关的分析策略注册、React Provider 接口与策略选择逻辑；不从核心入口导入 PostHog/GA SDK。

## Tags、使用者与场景

`type:platform` · `runtime:universal` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

跨端调用方需要公共接口时使用；实际 provider 从匹配 runtime 的 -web/-native/-server 选择。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

### 注册顺序

`registerMobileAnalyticsAdapter`、`registerDesktopAnalyticsAdapter`、`registerExtensionAnalyticsAdapter` 注册宿主实现。当前 `createStrategy` 在创建时查找 adapter，尚未注册会得到 noop；之后注册不会自动替换已经返回的 noop。宿主必须在选择/导出策略前完成注册，并测试真实调用抵达 SDK；只挂 Provider 不代表事件已发送。

## 环境变量与配置来源

本项目不直接读取环境变量，也不自行加载 .env。配置由宿主通过参数/context 提供；若消费其他库，仍需遵守被调用库的配置契约。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project analytics --json
pnpm nx run analytics:lint
pnpm nx run analytics:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run analytics:test --run
```

mock adapter，验证 provider 注册、调用转发、缺 provider/重复初始化、错误行为；不能在 core 的单测里初始化真实 SDK。

现有用例示例：[src/lib/provider.spec.tsx](src/lib/provider.spec.tsx)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
