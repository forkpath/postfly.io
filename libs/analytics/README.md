# `@libs/analytics`

`ray` 的统一埋点库，参考 `core/packages/analytics` 迁移而来，当前只保留 `web` / `mobile` 两个平台能力，以及 `PostHog`、`Google Analytics` 两个 provider。

## 导出入口

- `@libs/analytics`: 公共类型、provider 选择工具、env preset、mobile adapter 注册能力
- `@libs/analytics/web`: web 端 `Provider`、`track`、`identify`、`reset`
- `@libs/analytics/server`: 服务端 `track`
- `@libs/analytics/mobile`: mobile 端 `Provider`、`track`、`identify`、`reset`
- `@libs/analytics/env`: `webPreset`、`mobilePreset`、`serverPreset`

## Web 使用方式

1. 配置环境变量

```bash
VITE_ANALYTICS_PROVIDER=posthog
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com

# 或者
VITE_ANALYTICS_PROVIDER=google-analytics
VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID=G-XXXXXXX
GOOGLE_ANALYTICS_SECRET=xxxx
ANALYTICS_PROVIDER=google-analytics
```

2. 在应用根部挂载 Provider

```tsx
import { identify, Provider, reset } from '@libs/analytics/web'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>
}
```

3. 登录态变化时调用

```tsx
identify(user.id, { email: user.email, name: user.name })
reset()
```

4. 服务端埋点

```ts
import { track } from '@libs/analytics/server'

track('billing_checkout_created', {
  distinctId: userId,
  plan: planSlug
})
```

## Mobile 使用方式

当前阶段先提供与 `apps/mobile` 解耦的 adapter 注册机制，方便在 Expo App 真正落地时接入原生 SDK，而不会让 `analytics` 库在没有 mobile app 的阶段就强绑 Expo/React Native 依赖。

```tsx
import { AnalyticsProvider, registerMobileAnalyticsAdapter } from '@libs/analytics'
import { Provider } from '@libs/analytics/mobile'

registerMobileAnalyticsAdapter('posthog', {
  Provider: ({ children }) => children,
  track: (event, data) => console.log(event, data),
  identify: (userId, traits) => console.log(userId, traits),
  reset: () => undefined
})
```

`apps/mobile` 阶段会把真实的 Expo / React Native provider 绑定到这个 adapter 层上。

## 验证

```bash
nx run analytics:lint
nx run analytics:typecheck
nx run analytics:test
```
