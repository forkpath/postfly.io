# `@libs/analytics`

`ray` 的统一埋点库，支持 `web` / `server` / `mobile` / `desktop` / `extension` 五端，以及 `PostHog`、`Google Analytics` 两个 provider。

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
    web/                ← web 直接实现（GA、PostHog、page-view hook）
    server/             ← 服务端直接实现（GA Measurement Protocol、PostHog Node）
    mobile/             ← mobile adapter 代理
    desktop/            ← desktop adapter 代理
    extension/          ← extension adapter 代理
```

**设计原则：**

- **PostHog**：`posthog-js`、`@posthog/react` 和 `posthog-node` 是跨框架通用的（PostHog 不提供框架级 SDK），web 和 server 直接内联实现
- **Google Analytics**：web 使用 `gtag.js`（内联），server 使用 Measurement Protocol（内联）
- `mobile`、`desktop`、`extension` 使用 **adapter 模式**，由各 app 在启动时注册平台原生 SDK，避免 analytics 库硬绑定 Expo / Electron / WXT 等依赖
- 所有 adapter 通过 `lib/adapter.tsx` 中的泛化工厂创建，无重复代码

**依赖说明：**

| 包 | 用途 |
|---|---|
| `posthog-js` | 浏览器端 PostHog SDK |
| `@posthog/react` | React 封装（`PostHogProvider`、`usePostHog` 等），支持 `@posthog/react/slim` tree-shaking |
| `posthog-node` | 服务端 PostHog SDK |

## 导出入口

| 入口 | 导出 |
|---|---|
| `@libs/analytics` | 公共类型、provider 工具、env preset、adapter 注册函数 |
| `@libs/analytics/web` | `Provider`、`track`、`identify`、`reset` |
| `@libs/analytics/server` | `track` |
| `@libs/analytics/mobile` | `Provider`、`track`、`identify`、`reset` |
| `@libs/analytics/desktop` | `Provider`、`track`、`identify`、`reset` |
| `@libs/analytics/extension` | `Provider`、`track`、`identify`、`reset` |

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

## Mobile / Desktop / Extension 使用方式

三端均使用 adapter 模式，在 app 启动时注册原生 SDK 实现，analytics 库不会引入平台特定依赖。

### 1. 注册 adapter（在 app 入口）

```tsx
// apps/mobile — Expo / React Native
import { AnalyticsProvider, registerMobileAnalyticsAdapter } from '@libs/analytics'
registerMobileAnalyticsAdapter(AnalyticsProvider.POSTHOG, { ... })

// apps/desktop — Electron
import { AnalyticsProvider, registerDesktopAnalyticsAdapter } from '@libs/analytics'
registerDesktopAnalyticsAdapter(AnalyticsProvider.POSTHOG, { ... })

// apps/extension — WXT / Browser Extension
import { AnalyticsProvider, registerExtensionAnalyticsAdapter } from '@libs/analytics'
registerExtensionAnalyticsAdapter(AnalyticsProvider.POSTHOG, { ... })
```

### 2. 使用埋点

```tsx
import { Provider, track, identify, reset } from '@libs/analytics/mobile'
// 或 '@libs/analytics/desktop' / '@libs/analytics/extension'

// 挂载 Provider
<Provider>{children}</Provider>

// 埋点
track('button_clicked', { button: 'upgrade' })
identify(user.id, { email: user.email })
reset()
```

## 验证

```bash
nx run analytics:lint
nx run analytics:typecheck
nx run analytics:test
```
