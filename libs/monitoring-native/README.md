# monitoring-native

## 用途

错误/用户监控的 native 运行时实现，隔离 provider SDK 与对应环境配置。

## Tags、使用者与场景

`type:platform` · `runtime:native` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Mobile/Native provider；不让通用 core 导入 Expo/RN SDK。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

### 宿主 SDK 注册

Native strategy 委托 core registry，不自行初始化 Native SDK。宿主调用 registerMobileMonitoringAdapter，再调用 initialize/identify/captureException；未注册时不执行 SDK 调用。当前 Mobile 的 src/lib/monitoring/sentry.tsx 注册 Sentry，尚未提供 Native PostHog monitoring adapter，不能仅改 provider 字符串就宣称已接入。

## 环境变量与配置来源

src/env.ts 使用静态 `process.env.EXPO_PUBLIC_*`，由宿主 Expo 构建注入；不自行加载 env 文件。schema 可接受的 provider 名称不等于本平台都已实现，检查 providers/mobile 的实际策略。

| 变量                                                        | 含义                         | 何时配置/默认                                                          | 值从哪里来              |
| ----------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `EXPO_PUBLIC_MONITORING_PROVIDER`                           | 错误监控 provider            | 默认 sentry；schema 接受 posthog/sentry，native 实际策略另见 providers | 开发者选择              |
| `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_ENVIRONMENT` | Sentry 项目接收地址/环境标记 | DSN 可选；environment 默认 development                                 | Sentry 对应平台项目设置 |

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project monitoring-native --json
pnpm nx run monitoring-native:lint
pnpm nx run monitoring-native:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run monitoring-native:test --run
```

参考 src/runtime.spec 文件，mock provider SDK、隔离 env/import 缓存，验证默认/显式 provider、API 转发、初始化和缺配置行为。网络投递/设备生命周期另做集成测试。

现有用例示例：[src/runtime.spec.ts](src/runtime.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
