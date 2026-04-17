# `apps/mobile`

`ray` 的 Expo / React Native 客户端，完整覆盖 setup / dashboard 业务链路：

- `setup`：欢迎、登录、注册、多步引导
- `dashboard`：用户与组织双 Tab 体系
- `billing`：基于 `@libs/billing/mobile` 的 RevenueCat 订阅/一次性购买与 Paywall
- `analytics` / `monitoring`：PostHog + Sentry 真实 SDK 集成

## 运行方式

先安装依赖：

```bash
pnpm install
```

从仓库根启动：

```bash
pnpm dev:mobile
pnpm mobile:ios
pnpm mobile:android
```

或直接在 app 目录：

```bash
pnpm --filter mobile dev
pnpm --filter mobile dev:ios
pnpm --filter mobile dev:android
```

## 关键环境变量

```bash
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
EXPO_PUBLIC_SITE_URL=http://localhost:3000
EXPO_PUBLIC_DEFAULT_LOCALE=zh

EXPO_PUBLIC_ANALYTICS_PROVIDER=posthog
EXPO_PUBLIC_MONITORING_PROVIDER=sentry

EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxx
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME=ray_premium_lifetime
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY=ray_premium_monthly
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY=ray_premium_yearly
```

说明：

- 计费在移动端固定使用 RevenueCat（`@libs/billing/mobile`），无需运行时切换 provider。
- PostHog / Sentry / RevenueCat 的 provider 在 `src/lib/{analytics,monitoring,providers/billing}.tsx` 中直接注册对应 SDK。

## 验证

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile exec expo export --platform ios --platform android
```
