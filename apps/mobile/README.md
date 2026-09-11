# mobile

## 用途

React Native + Expo Router 移动应用，组合 Native 认证/UI、RevenueCat 购买、分析监控；build 是本地 export，不等于 EAS 二进制发布。

## Tags、使用者与场景

`type:app` · `runtime:native` · `domain:composition`。这是当前 Nx resolved configuration，不是根据目录猜测的分类。

iOS/Android 用户；Native feature 与通用契约供本 app 使用，禁止引入 Node/DOM 库。

依赖同时受 type/runtime/domain 限制，详见[根目录规则](../../README.md#当前实际依赖规则)。仅通过已声明 public API 使用，不跨项目相对路径导入源码。

## 环境变量与配置来源

根 dev wrapper 注入 .env；src/lib/env.ts 与 app.config.ts 使用公开 Expo 变量。真实设备需开发机构建/可达网络，localhost 不指开发机。EAS 配置单独维护；`EXPO_PUBLIC_*` 不是秘密。billing-client-native 当前动态 env 限制仍需处理。

| 变量                                                                                                                                                   | 含义                                    | 何时配置/默认                                                          | 值从哪里来                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_SITE_URL`                                                                                                    | API/站点公开地址                        | 默认 localhost:8000/3000，真机必须替换                                 | 部署地址或开发机局域网地址                      |
| `EXPO_PUBLIC_DEFAULT_LOCALE` / `EXPO_PUBLIC_THEME_MODE` / `EXPO_PUBLIC_THEME_COLOR`                                                                    | 移动语言/主题                           | 应用 env.ts 定义默认值                                                 | 产品设计配置                                    |
| `EXPO_PUBLIC_AUTH_PASSWORD` / `EXPO_PUBLIC_AUTH_MAGIC_LINK` / `EXPO_PUBLIC_AUTH_EMAIL_OTP` / `EXPO_PUBLIC_AUTH_ANONYMOUS`                              | 移动认证 UI 开关                        | 默认 true/false/false/true                                             | 与服务端能力一致                                |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS` / `EXPO_PUBLIC_GOOGLE_CLIENT_ID`                                                                                    | Google 登录公开 client ID，iOS 专属优先 | 按登录场景配置                                                         | Google OAuth 后台                               |
| `EXPO_PUBLIC_MIXPANEL_TOKEN`                                                                                                                           | 应用 env.ts 保留的 Mixpanel token 字段  | 可选；声明字段不等于已有完整 provider                                  | Mixpanel 项目公开 token                         |
| `EXPO_PUBLIC_EAS_PROJECT_ID` / `EXPO_PUBLIC_EAS_UPDATES_URL`                                                                                           | Expo 项目 ID 与 OTA 更新 URL            | 真实 EAS 构建/更新必须替换空值与 placeholder                           | Expo/EAS 项目后台                               |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`                                                                        | iOS/Android 公开 SDK key                | 相应平台购买功能需要；缺少则跳过 SDK configure                         | RevenueCat 对应平台 Public SDK key              |
| `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` / `EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY`                                                                       | 以上变量未设时的兼容别名                | 仅兼容                                                                 | 旧移动配置；不是服务端 REST key                 |
| `VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY` / `VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY`                | 终身/月/年套餐 Price ID                 | 使用相应 Stripe 套餐时配置                                             | Stripe Dashboard 创建 Price 后取得；不是 secret |
| `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY` / `EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY` | 终身/月/年套餐产品标识                  | 使用相应移动套餐时配置                                                 | App Store/Play 产品与 RevenueCat Catalog 映射   |
| `EXPO_PUBLIC_ANALYTICS_PROVIDER`                                                                                                                       | 分析 provider 选择                      | 默认 posthog；schema 也接受 google-analytics，是否有实现需看 providers | 开发者选择；native 不应据 enum 推断有 GA 实现   |
| `EXPO_PUBLIC_POSTHOG_KEY` / `EXPO_PUBLIC_POSTHOG_HOST`                                                                                                 | PostHog 项目 key/接收端点               | 启用 PostHog 时填写 key；host 默认 https://us.i.posthog.com            | PostHog 项目设置                                |
| `EXPO_PUBLIC_MONITORING_PROVIDER`                                                                                                                      | 错误监控 provider                       | 默认 sentry；schema 接受 posthog/sentry，native 实际策略另见 providers | 开发者选择                                      |
| `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_SENTRY_ENVIRONMENT`                                                                                            | Sentry 项目接收地址/环境标记            | DSN 可选；environment 默认 development                                 | Sentry 对应平台项目设置                         |

读取/配置定义：[src/lib/env.ts](src/lib/env.ts)。

加载时机、dotenv wrapper 和秘密管理见[环境指南](../../docs/development/environment.md)。本表未包含真实凭据。

## 运行与构建

所有命令从仓库根执行：

```sh
pnpm nx show project mobile --json
pnpm dev:mobile
pnpm nx run mobile:build
pnpm nx run mobile:lint
pnpm nx run mobile:typecheck
```

本机原生运行用 `pnpm mobile:ios` / `pnpm mobile:android`，需 Xcode/Android SDK。`pnpm nx run mobile:build` 聚合 export；`pnpm nx run mobile:release` 为 EAS 构建，`pnpm nx run mobile:submit` 为商店提交，均有外部副作用。

## 单元测试：运行与编写

当前没有标准 `mobile:test` target，不能执行不存在的命令或用 lint/build 成功冒充单测。接入步骤见[测试开发指南](../../docs/development/testing.md#没有-test-target-怎么办)。

无 test target；需接入 Expo/RN 兼容测试环境与 Native SDK mock，再写 auth/provider/购买状态/离线错误等测试；不能直接套浏览器 jsdom 当真机证明。

新增用例放项目 `src` 内，按配置 include 使用 `*.spec.ts`/`*.spec.tsx`；先看 [测试指南](../../docs/development/testing.md) 的环境、mock 与非零用例要求。测试说明不代表本次已经执行全部测试。

## E2E：运行与编写

暂无设备 E2E target。后续建立固定版本 Maestro/Detox 等方案、模拟器/开发构建、隔离账户，写登录深链、组织切换、权限弹窗、sandbox 购买/恢复场景；export 只验证打包。

所有有写入的流程使用隔离数据/测试账户，缺用例需要额外开发；mock 单测、构建和 readiness 不等于 E2E 完成。[跨端测试方法](../../docs/development/testing.md#其他应用服务-e2e)。
