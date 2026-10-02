# web

## 用途

TanStack React Start 的营销站与 SaaS Web 应用，组合 Studio/UI、客户端认证、API 与分析监控；production build 输出 .output。

## Tags、使用者与场景

`type:app` · `runtime:web` · `domain:composition`。

最终用户通过浏览器访问；它是组合入口，不允许其他项目导入 app 源码。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../docs/architecture/ray-framework-nx-guide.md#公共入口与运行时)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

根 `dev:web` 通过 dotenv 注入 `.env`，`vite.config.mts` 的 `envDir` 指向根目录。

- `WEB_PORT`：本地端口，默认 3000；值由开发端口规划决定。
- `HOST` / `PORT`：部署后的 Node server 监听地址/端口，由部署配置提供。
- 开发 `/api` 代理目前固定指向 `http://localhost:8000`，只改 `ENGINE_PORT` 不会自动改代理。
- 前缀为 `VITE_` 的变量属于构建时公开配置，不放服务端 secret。

| 变量                                                                                                                                                   | 含义                              | 何时配置/默认                                                          | 值从哪里来                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `VITE_URL`                                                                                                                                             | 站点对外 URL                      | Web 使用当前 origin；SSR/file 使用 VITE_URL，缺省 localhost:3000       | 站点部署域名                                    |
| `VITE_API_ENDPOINT`                                                                                                                                    | Studio Better Auth 客户端 baseURL | 可选；同源时可留空                                                     | Engine 对外认证地址                             |
| `VITE_DEFAULT_LOCALE` / `VITE_THEME_MODE` / `VITE_THEME_COLOR`                                                                                         | 初始语言、主题模式、主题色        | 默认 en/system/orange（具体可用值见 ui-core）                          | 产品设计配置                                    |
| `VITE_AUTH_PASSWORD` / `VITE_AUTH_MAGIC_LINK` / `VITE_AUTH_PASSKEY` / `VITE_AUTH_ANONYMOUS`                                                            | 认证 UI 功能开关                  | 默认 true/false/true/true                                              | 应与服务端能力一致；不是安全权限开关            |
| `CONTACT_EMAIL`                                                                                                                                        | 联系邮箱                          | 若使用 Studio env 模块，其 server schema 必填合法 email                | 公开业务联系地址                                |
| `NODE_ENV`                                                                                                                                             | 运行模式                          | 默认 development                                                       | 构建/启动命令                                   |
| `API_BASE_URL`                                                                                                                                         | SSR 默认 API 地址                 | 默认 http://localhost:8000                                             | SSR 可达的 Engine 地址；显式 baseURL 参数优先   |
| `VITE_API_BASE_URL`                                                                                                                                    | Desktop/Extension 默认 API 地址   | 默认 http://localhost:8000                                             | 客户端可达 Engine 地址；显式 baseURL 参数优先   |
| `EXPO_PUBLIC_API_BASE_URL`                                                                                                                             | Mobile 默认 API 地址              | 默认 http://localhost:8000                                             | 手机可达 Engine 地址；推荐宿主静态读取后传参    |
| `VITE_ANALYTICS_PROVIDER`                                                                                                                              | 分析 provider 选择                | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现   |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`                                                                                                               | PostHog 项目 key/接收端点         | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                                |
| `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID`                                                                                                                 | GA4 Measurement ID                | 启用 GA 时配置                                                         | GA4 数据流设置                                  |
| `VITE_MONITORING_PROVIDER`                                                                                                                             | 错误监控 provider                 | 默认 sentry；schema 接受 posthog/sentry，native 实际策略另见 providers | 开发者选择                                      |
| `VITE_SENTRY_DSN` / `VITE_SENTRY_ENVIRONMENT`                                                                                                          | Sentry 项目接收地址/环境标记      | DSN 可选；environment 默认 development                                 | Sentry 对应平台项目设置                         |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`                                                                                                               | PostHog 监控配置                  | 选择 PostHog 时使用；host 默认 https://us.i.posthog.com                | PostHog 项目设置                                |
| `VITE_SENTRY_DESKTOP_DSN` / `VITE_SENTRY_EXTENSION_DSN`                                                                                                | desktop/extension 子入口 DSN      | 使用对应入口时填写                                                     | Sentry 对应平台项目                             |
| `VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY`                | 终身/月/年套餐 Price ID           | 使用相应 Stripe 套餐时配置                                             | Stripe Dashboard 创建 Price 后取得；不是 secret |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY` | 终身/月/年套餐产品标识            | 使用相应移动套餐时配置                                                 | App Store/Play 产品与 RevenueCat Catalog 映射   |

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project web --json
pnpm dev:web
pnpm nx run web:build
pnpm nx run web:lint
pnpm nx run web:typecheck
```

## 单元测试：运行与编写

```sh
pnpm nx run web:test
pnpm nx run web:typecheck-tests
```

使用独立 Vitest/jsdom 配置，验证会话身份同步、定时器生命周期，以及正式路由的登录跳转、平台管理员权限和会话服务失败。路由测试位于 `src/__tests__`，不放进文件路由目录。新增用例放在 `src/**/*.spec.ts` / `*.spec.tsx`；测试不加载生产构建插件或开发 `.env`。报告在 `dist/test-results/web/unit`，新增用例要求见 [测试指南](../../docs/development/testing.md)。

## E2E：运行与编写

`pnpm nx run web-e2e:e2e` 依赖 Web 构建，Playwright 启动正式产物。默认框架 CI 验证公开页面在 Chromium、Firefox、WebKit 中的行为。需要真实 Engine、预置账户或厂商服务的历史业务场景另行启用，不能把跳过计作通过。

变量、隔离数据要求、skip 条件和新增用例步骤见 [web-e2e](../web-e2e/README.md)；真实 Engine/Pulse/Worker 协议测试由各服务的独立套件负责。
