# monitoring-web

## 用途

错误/用户监控的 web 运行时实现，隔离 provider SDK 与对应环境配置。

## Tags、使用者与场景

`type:platform` · `runtime:web` · `domain:platform`。

Web、Desktop renderer、Extension；该库有对应 web/desktop/extension 子入口，优先使用已声明的 alias。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

### 宿主 SDK 注册

Web Sentry 与 Desktop/Extension 的 strategy 使用 core 对应 registry；宿主分别通过 registerWebMonitoringAdapter/registerDesktopMonitoringAdapter/registerExtensionMonitoringAdapter 提供 SDK 实现，再 initialize。缺少 adapter 时调用不产生上报；env 有 DSN 并不等于 SDK 已注册。Web PostHog 分支例外：直接使用 posthog-js，根据 VITE_POSTHOG_KEY/HOST 初始化，无需另注册该 adapter。

## 环境变量与配置来源

src/env.ts 优先 import.meta.env，再使用进程中同名公开变量；构建配置由 Vite/WXT 宿主负责，库不读取文件。

| 变量                                                    | 含义                         | 何时配置/默认                                                          | 值从哪里来              |
| ------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `VITE_MONITORING_PROVIDER`                              | 错误监控 provider            | 默认 sentry；schema 接受 posthog/sentry，native 实际策略另见 providers | 开发者选择              |
| `VITE_SENTRY_DSN` / `VITE_SENTRY_ENVIRONMENT`           | Sentry 项目接收地址/环境标记 | DSN 可选；environment 默认 development                                 | Sentry 对应平台项目设置 |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`                | PostHog 监控配置             | 选择 PostHog 时使用；host 默认 https://us.i.posthog.com                | PostHog 项目设置        |
| `VITE_SENTRY_DESKTOP_DSN` / `VITE_SENTRY_EXTENSION_DSN` | desktop/extension 子入口 DSN | 使用对应入口时填写                                                     | Sentry 对应平台项目     |

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project monitoring-web --json
pnpm nx run monitoring-web:lint
pnpm nx run monitoring-web:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run monitoring-web:test --run
```

参考 src/runtime.spec 文件，mock provider SDK、隔离 env/import 缓存，验证默认/显式 provider、API 转发、初始化和缺配置行为。网络投递/设备生命周期另做集成测试。

现有用例示例：[src/runtime.spec.tsx](src/runtime.spec.tsx)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
