# `apps/mobile`

`ray` 的精简版 Expo / React Native 客户端，参考 `core/apps/mobile` 迁移，但只保留当前阶段最需要的能力：

- `setup`：欢迎、登录、注册
- `dashboard`：基础登录后首页
- `billing`：基于 `@libs/billing/mobile` 的移动端账单与升级入口
- `analytics` / `monitoring` / `billing`：通过 mobile adapter 注册到 app

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
EXPO_PUBLIC_DEFAULT_LOCALE=zh

EXPO_PUBLIC_ANALYTICS_PROVIDER=posthog
EXPO_PUBLIC_MONITORING_PROVIDER=sentry
EXPO_PUBLIC_BILLING_MOBILE_PROVIDER=revenuecat
```

说明：

- 当前阶段为了优先打通 app 壳层与业务路由，analytics / monitoring / billing 默认接入的是 app 内 mock adapter。
- 后续如果需要切到真实 PostHog / Sentry / RevenueCat / Superwall SDK，只需要替换 `src/lib/mobile-integrations.tsx` 中的注册实现。

## 验证

```bash
pnpm --filter mobile typecheck
pnpm --filter mobile exec expo export --platform ios --platform android
```
