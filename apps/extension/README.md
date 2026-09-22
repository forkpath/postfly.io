# extension

## 用途

WXT 浏览器扩展，包含 popup/content/background 交互，使用 Web 认证、API 和监控。

## Tags、使用者与场景

`type:app` · `runtime:web` · `domain:composition`。

Chrome/Firefox 用户；通过浏览器加载扩展产物，不能由其他库导入此 app。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

env.ts 读取 VITE_URL（站点地址）、VITE_API_BASE_URL（Engine）、VITE_DEFAULT_LOCALE/VITE_THEME_MODE/VITE_THEME_COLOR（UI 设置），均由根 .env/部署构建提供；wxt.config.ts 根据 MODE/NODE_ENV 加载根 env。监控使用 VITE_SENTRY_EXTENSION_DSN 与 VITE_SENTRY_ENVIRONMENT（Sentry 后台/环境名），埋点用 VITE_POSTHOG_KEY/HOST。公开配置不要放 token/secret。

| 变量                                     | 含义                            | 何时配置/默认                                                          | 值从哪里来                                    |
| ---------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| `API_BASE_URL`                           | SSR 默认 API 地址               | 默认 http://localhost:8000                                             | SSR 可达的 Engine 地址；显式 baseURL 参数优先 |
| `VITE_API_BASE_URL`                      | Desktop/Extension 默认 API 地址 | 默认 http://localhost:8000                                             | 客户端可达 Engine 地址；显式 baseURL 参数优先 |
| `EXPO_PUBLIC_API_BASE_URL`               | Mobile 默认 API 地址            | 默认 http://localhost:8000                                             | 手机可达 Engine 地址；推荐宿主静态读取后传参  |
| `VITE_ANALYTICS_PROVIDER`                | 分析 provider 选择              | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现 |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` | PostHog 项目 key/接收端点       | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                              |
| `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID`   | GA4 Measurement ID              | 启用 GA 时配置                                                         | GA4 数据流设置                                |

依赖配置：[auth-client-web](../../libs/auth-client-web/README.md)、[monitoring-web](../../libs/monitoring-web/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

读取/配置定义：[env.ts](env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project extension --json
pnpm dev:extension
pnpm nx run extension:build
pnpm nx run extension:lint
pnpm nx run extension:typecheck
```

`pnpm nx run extension:dev-firefox` 开发 Firefox；`pnpm nx run extension:build` 聚合 Chrome/Firefox 打包，产物目录 build/.output；不要将生成 ZIP 当作商店已发布。

## 单元测试：运行与编写

当前没有标准 `extension:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

无 test target；需配置 Vitest/jsdom，mock chrome/browser/storage/message API，测试会话和跨页面通信；此 mock 不证明浏览器权限配置正确。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。

## E2E：运行与编写

暂无扩展 E2E target。后续启动加载真实 build 目录的浏览器实例，测试 popup/content/background、跨域权限、storage、登录/注销；Firefox 单独适配。Web E2E 不会自动加载扩展。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#web-与服务集成)。
