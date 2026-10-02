# monitoring-server

## 用途

错误/用户监控的 server 运行时实现，隔离 provider SDK 与对应环境配置。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。

Node 服务/SSR 的明确服务端逻辑；不能被浏览器/Native 引用。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

### 宿主 SDK 注册

Sentry strategy 通过 core 的 server registry 委托：Node 宿主需要调用 registerServerMonitoringAdapter 提供真实 initialize/captureException，只设置 DSN 不会自动建立 Sentry SDK，未注册时为 no-op。PostHog 分支则直接使用 posthog-node，提供 POSTHOG_KEY 后可在 initialize/首次捕获时创建 client。Engine 的 instrument.ts 直接初始化 @sentry/nestjs，是另一路径，不能用它证明本库 Sentry adapter 已注册。

## 环境变量与配置来源

src/env.ts 只读取 Node 进程环境，由启动配置注入。

| 变量                                | 含义                         | 何时配置/默认                                                          | 值从哪里来              |
| ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------- | ----------------------- |
| `MONITORING_PROVIDER`               | 错误监控 provider            | 默认 sentry；schema 接受 posthog/sentry，native 实际策略另见 providers | 开发者选择              |
| `SENTRY_DSN` / `SENTRY_ENVIRONMENT` | Sentry 项目接收地址/环境标记 | DSN 可选；environment 默认 development                                 | Sentry 对应平台项目设置 |
| `POSTHOG_KEY` / `POSTHOG_HOST`      | PostHog 监控配置             | 选择 PostHog 时使用；host 默认 https://us.i.posthog.com                | PostHog 项目设置        |

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project monitoring-server --json
pnpm nx run monitoring-server:lint
pnpm nx run monitoring-server:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run monitoring-server:test --run
```

参考 src/runtime.spec 文件，mock provider SDK、隔离 env/import 缓存，验证默认/显式 provider、API 转发、初始化和缺配置行为。网络投递/设备生命周期另做集成测试。

现有用例示例：[src/runtime.spec.ts](src/runtime.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。
