# analytics-web

## 用途

分析埋点的 web 运行时实现，隔离 provider SDK 与对应环境配置。

## Tags、使用者与场景

`type:platform` · `runtime:web` · `domain:platform`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

Web、Desktop renderer、Extension；该库有对应 web/desktop/extension 子入口，优先使用已声明的 alias。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

### Web 与 Desktop/Extension 入口区别

Web strategy 包含浏览器实现；Desktop/Extension 子入口通过 core 的对应 registry 获取宿主 adapter。宿主需先执行 registerDesktopAnalyticsAdapter/registerExtensionAnalyticsAdapter，再创建/加载策略；未注册时为 noop，之后注册不会自动替换已选 noop。SDK 注册和实际事件投递需分别测试。

## 环境变量与配置来源

src/env.ts 优先 import.meta.env，再使用进程中同名公开变量；构建配置由 Vite/WXT 宿主负责，库不读取文件。

| 变量                                     | 含义                      | 何时配置/默认                                                          | 值从哪里来                                    |
| ---------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| `VITE_ANALYTICS_PROVIDER`                | 分析 provider 选择        | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现 |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog 项目 key/接收端点 | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                              |
| `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID`   | GA4 Measurement ID        | 启用 GA 时配置                                                         | GA4 数据流设置                                |

读取/配置定义：[src/env.ts](src/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project analytics-web --json
pnpm nx run analytics-web:lint
pnpm nx run analytics-web:typecheck
```

这是库，不启动独立 HTTP/前台进程。通过宿主应用调用 [src/index.ts](src/index.ts) 公共导出；没有标准 build target，源码随消费者构建，不要把 build-deps 当成本库编译产物。

## 单元测试：运行与编写

```sh
pnpm nx run analytics-web:test --run
```

参考 src/runtime.spec 文件，mock provider SDK、隔离 env/import 缓存，验证默认/显式 provider、API 转发、初始化和缺配置行为。网络投递/设备生命周期另做集成测试。

现有用例示例：[src/runtime.spec.tsx](src/runtime.spec.tsx)。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。
