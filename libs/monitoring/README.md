# `@libs/monitoring`

`ray` 的统一监控库，支持 `web` / `server` / `mobile` / `desktop` / `extension` 五端，以及 `PostHog`、`Sentry` 两个 provider。

## 架构

```
src/
  index.ts              ← 公共 API：类型、provider 工具、env preset、adapter 注册
  env.ts                ← 所有平台的环境变量 preset
  web.tsx               ← web 端入口
  server.ts             ← 服务端入口
  mobile.tsx            ← mobile 端入口（adapter 模式）
  desktop.tsx           ← desktop 端入口（adapter 模式）
  extension.tsx         ← extension 端入口（adapter 模式）
  lib/
    types.ts            ← 共享类型
    provider.ts         ← strategy 选择工具
    adapter.tsx         ← 泛化 adapter 工厂 + 各平台注册表
  providers/
    web/                ← PostHog 内联实现 + Sentry adapter 代理
    server/             ← PostHog 内联实现 + Sentry adapter 代理
    mobile/             ← adapter 代理
    desktop/            ← adapter 代理
    extension/          ← adapter 代理
```

**设计原则：**

- **PostHog**：`posthog-js` 和 `posthog-node` 是跨框架通用的，web 和 server 直接内联实现
- **Sentry**：各框架有专属 SDK（`@sentry/nestjs`、`@sentry/react`、`@sentry/electron`、`@sentry/react-native` 等），泛化的 `@sentry/node` / `@sentry/react` 会丢失框架级集成能力。因此 **Sentry 全端走 adapter 模式**，由各 app 引入对应框架的 SDK 并注册

## 导出入口

| 入口 | 导出 |
|---|---|
| `@libs/monitoring` | 公共类型、provider 工具、env preset、adapter 注册函数 |
| `@libs/monitoring/web` | `Provider`、`initialize`、`identify`、`captureException` |
| `@libs/monitoring/server` | `initialize`、`captureException` |
| `@libs/monitoring/mobile` | `Provider`、`initialize`、`identify`、`captureException` |
| `@libs/monitoring/desktop` | `Provider`、`initialize`、`identify`、`captureException` |
| `@libs/monitoring/extension` | `Provider`、`initialize`、`identify`、`captureException` |

## PostHog（开箱即用）

PostHog 无需注册 adapter，配置环境变量即可直接使用：

```bash
VITE_MONITORING_PROVIDER=posthog
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

```tsx
import { captureException, identify, initialize, Provider } from '@libs/monitoring/web'

initialize()
identify({ id: user.id, email: user.email, name: user.name })
captureException(error, { feature: 'billing' })

return <Provider>{children}</Provider>
```

## Sentry（需要在 app 层注册 adapter）

Sentry 的价值在于**框架深度集成**（自动异常捕获、performance tracing、sourcemap 等），因此需要在各 app 中引入对应框架的 SDK 并注册 adapter。

### 各平台推荐 SDK

| 平台 | 推荐 SDK | 说明 |
|---|---|---|
| Server (NestJS) | `@sentry/nestjs` | `SentryModule.forRoot()`、`SentryGlobalFilter`、`@SentryTraced()` |
| Web (TanStack Start) | `@sentry/react` | ErrorBoundary、browserTracing、Replay |
| Mobile (Expo/RN) | `@sentry/react-native` | 原生 crash 捕获、ANR 检测 |
| Desktop (Electron) | `@sentry/electron` (main) + `@sentry/react` (renderer) | 主/渲染进程分别初始化 |
| Extension (WXT) | `@sentry/browser` | 浏览器 extension 环境 |

### 注册位置

Adapter 注册必须在对应 `@libs/monitoring/<platform>` 被导入之前执行（策略在模块求值时创建），因此使用**副作用导入**（side-effect import）确保顺序。

| App | 注册文件 | 导入位置 |
|---|---|---|
| `services/engine` | `src/instrument.ts` | `main.ts` 第一行 `import './instrument'` |
| `apps/web` | `src/lib/monitoring/sentry.tsx` | `providers/monitoring.tsx` 顶部 `import '../monitoring/sentry'` |
| `apps/mobile` | `src/lib/monitoring/sentry.tsx` | `providers.tsx` 顶部 `import './monitoring/sentry'` |
| `apps/extension` | `src/lib/monitoring/index.ts` | `providers/monitoring.tsx` 顶部 `import '~/lib/monitoring'` |
| `apps/desktop` | `src/main/instrument.ts` (main) + `src/renderer/lib/monitoring/sentry.tsx` (renderer) | `main.ts` + `providers/monitoring.tsx` |

### 注册代码示例

**Server（`services/engine/src/instrument.ts`）：**

```ts
import * as Sentry from '@sentry/nestjs'
import { registerServerMonitoringAdapter } from '@libs/monitoring'

if (process.env['SENTRY_DSN']) {
  Sentry.init({ dsn: process.env['SENTRY_DSN'], tracesSampleRate: 1.0 })
}

registerServerMonitoringAdapter('sentry', {
  initialize: () => { /* already initialized above */ },
  captureException: (error, extra) => { Sentry.captureException(error, { extra }) }
})
```

**Web（`apps/web/src/lib/monitoring/sentry.tsx`）：**

```tsx
import * as Sentry from '@sentry/react'
import { registerWebMonitoringAdapter } from '@libs/monitoring'

registerWebMonitoringAdapter('sentry', {
  Provider: ({ children }) => <Sentry.ErrorBoundary fallback={...}>{children}</Sentry.ErrorBoundary>,
  initialize: () => { Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, ... }) },
  identify: (info) => { Sentry.setUser(info ? { id: info.id, email: info.email } : null) },
  captureException: (error, extra) => { Sentry.captureException(error, { extra }) }
})
```

**Mobile（`apps/mobile/src/lib/monitoring/sentry.tsx`）：**

```tsx
import * as Sentry from '@sentry/react-native'
import { registerMobileMonitoringAdapter } from '@libs/monitoring'

registerMobileMonitoringAdapter('sentry', {
  initialize: () => { Sentry.init({ dsn: process.env['EXPO_PUBLIC_SENTRY_DSN'], ... }) },
  identify: (info) => { Sentry.setUser(info ? { id: info.id, email: info.email } : null) },
  captureException: (error, extra) => { Sentry.captureException(error, { extra }) }
})
```

**Desktop（主进程 `src/main/instrument.ts` + 渲染进程 `src/renderer/lib/monitoring/sentry.tsx`）：**

```ts
// main process
import * as Sentry from '@sentry/electron/main'
Sentry.init({ dsn: process.env['VITE_SENTRY_DESKTOP_DSN'] })
```

```tsx
// renderer process
import * as Sentry from '@sentry/react'
import { registerDesktopMonitoringAdapter } from '@libs/monitoring'
registerDesktopMonitoringAdapter('sentry', { ... })
```

**Extension（`apps/extension/src/lib/monitoring/index.ts`）：**

```ts
import { registerExtensionMonitoringAdapter } from '@libs/monitoring'
import { sentryMonitoringAdapter } from './sentry'  // uses @sentry/browser

registerExtensionMonitoringAdapter('sentry', sentryMonitoringAdapter)
```

## 环境变量

每个平台对应独立的 Sentry Project（DSN 不同），避免跨平台 Issue 混淆、Sourcemap 冲突和 Release 追踪错乱。`SENTRY_ENVIRONMENT` 可以共享（同一部署环境）。

```bash
# ── Provider 选择（所有平台）──
MONITORING_PROVIDER=sentry
VITE_MONITORING_PROVIDER=sentry
EXPO_PUBLIC_MONITORING_PROVIDER=sentry

# ── Sentry 环境标识（共享）──
SENTRY_ENVIRONMENT=production
VITE_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production

# ── Sentry DSN（每个平台一个独立 Project）──
SENTRY_DSN=https://xxx@sentry.io/server-project
VITE_SENTRY_DSN=https://xxx@sentry.io/web-project
VITE_SENTRY_DESKTOP_DSN=https://xxx@sentry.io/desktop-project
VITE_SENTRY_EXTENSION_DSN=https://xxx@sentry.io/extension-project
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/mobile-project

# ── PostHog（web/server 内联）──
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

## 验证

```bash
nx run monitoring:lint
nx run monitoring:typecheck
nx run monitoring:test
```
