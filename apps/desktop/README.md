# desktop

## 用途

Electron 桌面应用，main/preload 使用 Node/Electron，renderer 使用共享 Web/Studio 页面。当前 Nx 单项目标 runtime:web，是共享依赖边界，不是所有文件都纯浏览器。

## Tags、使用者与场景

`type:app` · `runtime:web` · `domain:composition`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

桌面最终用户；业务 UI 消费 Web 库，主进程能力经明确 IPC/preload 边界暴露。其他项目不得导入 app。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

dev:desktop 用根 .env；renderer Vite envDir 指向根，main/instrument.ts 单独从进程 env 读 Sentry。打包后的桌面进程不会自动拿到 CI 的环境；发布前必须验证 main 监控配置真正存在。签名凭据仅 CI/main 工具使用。

| 变量                                                                                                                                                   | 含义                                           | 何时配置/默认                                                          | 值从哪里来                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `DESKTOP_PORT`                                                                                                                                         | renderer 开发端口                              | 默认 4200                                                              | 本地端口规划                                    |
| `VITE_SENTRY_DESKTOP_DSN` / `VITE_SENTRY_ENVIRONMENT`                                                                                                  | 桌面 Sentry 项目与环境                         | 启用监控时配置                                                         | Sentry Desktop 项目 DSN；main 从进程 env 读取   |
| `CERTIFICATE_PATH` / `CERTIFICATE_PASSWORD`                                                                                                            | Windows 代码签名文件/密码                      | 仅 package/release 签名                                                | CI 安全文件与 secret                            |
| `APPLE_ID` / `APPLE_ID_PASSWORD` / `APPLE_TEAM_ID` / `APPLE_KEYCHAIN`                                                                                  | Apple 公证账号、应用专用密码、Team 和 keychain | 仅 macOS 签名/发布                                                     | Apple Developer/CI keychain；不得放 `VITE_`     |
| `VITE_URL`                                                                                                                                             | 站点对外 URL                                   | env.ts 要求合法 URL；appConfig 另有 localhost:3000 fallback            | 站点部署域名                                    |
| `VITE_API_ENDPOINT`                                                                                                                                    | Studio Better Auth 客户端 baseURL              | 可选；同源时可留空                                                     | Engine 对外认证地址                             |
| `VITE_DEFAULT_LOCALE` / `VITE_THEME_MODE` / `VITE_THEME_COLOR`                                                                                         | 初始语言、主题模式、主题色                     | 默认 en/system/orange（具体可用值见 ui-core）                          | 产品设计配置                                    |
| `VITE_AUTH_PASSWORD` / `VITE_AUTH_MAGIC_LINK` / `VITE_AUTH_PASSKEY` / `VITE_AUTH_ANONYMOUS`                                                            | 认证 UI 功能开关                               | 默认 true/false/true/true                                              | 应与服务端能力一致；不是安全权限开关            |
| `CONTACT_EMAIL`                                                                                                                                        | 联系邮箱                                       | 若使用 Studio env 模块，其 server schema 必填合法 email                | 公开业务联系地址                                |
| `NODE_ENV`                                                                                                                                             | 运行模式                                       | 默认 development                                                       | 构建/启动命令                                   |
| `API_BASE_URL`                                                                                                                                         | SSR 默认 API 地址                              | 默认 http://localhost:8000                                             | SSR 可达的 Engine 地址；显式 baseURL 参数优先   |
| `VITE_API_BASE_URL`                                                                                                                                    | Desktop/Extension 默认 API 地址                | 默认 http://localhost:8000                                             | 客户端可达 Engine 地址；显式 baseURL 参数优先   |
| `EXPO_PUBLIC_API_BASE_URL`                                                                                                                             | Mobile 默认 API 地址                           | 默认 http://localhost:8000                                             | 手机可达 Engine 地址；推荐宿主静态读取后传参    |
| `VITE_ANALYTICS_PROVIDER`                                                                                                                              | 分析 provider 选择                             | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现   |
| `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`                                                                                                               | PostHog 项目 key/接收端点                      | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                                |
| `VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID`                                                                                                                 | GA4 Measurement ID                             | 启用 GA 时配置                                                         | GA4 数据流设置                                  |
| `VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY`                | 终身/月/年套餐 Price ID                        | 使用相应 Stripe 套餐时配置                                             | Stripe Dashboard 创建 Price 后取得；不是 secret |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY` | 终身/月/年套餐产品标识                         | 使用相应移动套餐时配置                                                 | App Store/Play 产品与 RevenueCat Catalog 映射   |

依赖配置：[monitoring-web](../../libs/monitoring-web/README.md)。只在实际启用对应路径时提供厂商配置，不把服务端密钥放到客户端。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project desktop --json
pnpm dev:desktop
pnpm nx run desktop:build
pnpm nx run desktop:lint
pnpm nx run desktop:typecheck
```

`pnpm nx run desktop:build` 只生成 .vite bundle；`pnpm nx run desktop:package` 执行 Electron make，`pnpm nx run desktop:release` 会 publish，后两者有平台/签名/上传副作用且不可缓存。

## 单元测试：运行与编写

当前没有标准 `desktop:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

无 test target；renderer 用 jsdom，main/preload 使用 Node 环境并 mock Electron/IPC，需新建配置和真实用例。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。

## E2E：运行与编写

暂无 Desktop E2E target。后续接入 Playwright Electron runner，启动可执行程序，测试窗口、IPC 白名单、登录深链、退出；用独立账号/隔离 Engine。不能用 web-e2e 替代主进程和安装器测试。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#其他应用服务-e2e)。
