# analytics-server

## 用途

分析埋点的 server 运行时实现，隔离 provider SDK 与对应环境配置。

## Tags、使用者与场景

`type:platform` · `runtime:node` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Node 服务/SSR 的明确服务端逻辑；不能被浏览器/Native 引用。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

src/env.ts 只读取 Node 进程环境，由启动配置注入。

| 变量                                                               | 含义                                              | 何时配置/默认                                                          | 值从哪里来                                     |
| ------------------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| `ANALYTICS_PROVIDER`                                               | 分析 provider 选择                                | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现  |
| `POSTHOG_KEY` / `POSTHOG_HOST`                                     | PostHog 项目 key/接收端点                         | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                               |
| `GOOGLE_ANALYTICS_MEASUREMENT_ID`                                  | GA4 Measurement ID                                | 启用 GA 时配置                                                         | GA4 数据流设置                                 |
| `GOOGLE_ANALYTICS_SECRET` / `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID` | GA 服务端 secret / Measurement ID 的兼容 fallback | 仅 GA 服务端路径使用                                                   | GA4 Measurement Protocol 设置；secret 不得公开 |

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project analytics-server --json
pnpm nx run analytics-server:lint
pnpm nx run analytics-server:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run analytics-server:test --run
```

参考 src/runtime.spec 文件，mock provider SDK、隔离 env/import 缓存，验证默认/显式 provider、API 转发、初始化和缺配置行为。网络投递/设备生命周期另做集成测试。

现有用例示例：[src/runtime.spec.ts](src/runtime.spec.ts)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
