# `@libs/monitoring`

`ray` 的统一监控库，参考 `core/packages/monitoring` 迁移而来，当前只保留 `web` / `mobile` 两个平台，以及 `PostHog`、`Sentry` 两个 provider。

## 导出入口

- `@libs/monitoring`: 公共类型、provider 选择工具、env preset、mobile adapter 注册能力
- `@libs/monitoring/web`: web 端 `Provider`、`initialize`、`identify`、`captureException`
- `@libs/monitoring/server`: 服务端 `initialize`、`captureException`
- `@libs/monitoring/mobile`: mobile 端 `Provider`、`initialize`、`identify`、`captureException`
- `@libs/monitoring/env`: `webPreset`、`mobilePreset`、`serverPreset`

## Web 使用方式

```bash
VITE_MONITORING_PROVIDER=posthog
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com

# 或者
VITE_MONITORING_PROVIDER=sentry
VITE_SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
VITE_SENTRY_ENVIRONMENT=production
SENTRY_DSN=https://xxx.ingest.sentry.io/xxx
MONITORING_PROVIDER=sentry
```

```tsx
import { captureException, identify, initialize, Provider } from '@libs/monitoring/web'

initialize()
identify({ id: user.id, email: user.email, name: user.name })
captureException(error, { feature: 'billing' })

return <Provider>{children}</Provider>
```

## Mobile 使用方式

与 `analytics` 相同，当前阶段先通过 adapter 注入真实的 Expo / React Native SDK：

```tsx
import { registerMobileMonitoringAdapter } from '@libs/monitoring'

registerMobileMonitoringAdapter('sentry', {
  Provider: ({ children }) => children,
  initialize: () => undefined,
  identify: user => console.log(user),
  captureException: error => console.error(error)
})
```

`apps/mobile` 阶段会把真正的原生 provider 绑定进来。

## 验证

```bash
nx run monitoring:lint
nx run monitoring:typecheck
nx run monitoring:test
```
