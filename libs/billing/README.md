# `@libs/billing`

`ray` 的统一计费域库，当前阶段包含：

- `shared`：套餐配置、类型、价格工具、Prisma 持久化 helper
- `web`：Stripe Checkout / Billing Portal / Webhook
- `mobile`：RevenueCat / Superwall 的适配器接口与 provider 选择层

## 导出入口

- `@libs/billing`：公共类型、套餐配置、env preset、mobile adapter 注册能力
- `@libs/billing/server`：billing customer / subscription / order / webhook event 的读写 helper
- `@libs/billing/web`：`checkoutSchema`、`billingPortalSchema`、Stripe checkout / portal / webhook 能力
- `@libs/billing/mobile`：mobile `Provider`、`useCustomer`、`usePaywall`

## 环境变量

### Web / Server

```bash
BILLING_REFERENCE_TYPE=user

STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME=price_xxx
VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY=price_xxx
VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY=price_xxx
```

### Mobile

```bash
EXPO_PUBLIC_BILLING_MOBILE_PROVIDER=revenuecat
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_xxx
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_xxx
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME=ray_premium_lifetime
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY=ray_premium_monthly
EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY=ray_premium_yearly

EXPO_PUBLIC_SUPERWALL_API_KEY=sw_xxx
EXPO_PUBLIC_SUPERWALL_PLACEMENT_PREMIUM=premium
```

## Web 使用方式

```ts
import { createStripeBillingPortalSession, createStripeCheckoutSession } from '@libs/billing/web'

const checkout = await createStripeCheckoutSession({
  referenceId: user.id,
  email: user.email,
  variantId: 'premium-monthly',
  successUrl: 'https://app.example.com/billing/success',
  cancelUrl: 'https://app.example.com/billing/cancel'
})

const portal = await createStripeBillingPortalSession({
  referenceId: user.id,
  email: user.email,
  returnUrl: 'https://app.example.com/settings/billing'
})
```

Stripe webhook：

```ts
import { handleStripeWebhook } from '@libs/billing/web'

await handleStripeWebhook({
  payload: rawBody,
  signature: request.headers['stripe-signature'] as string
})
```

## Mobile 使用方式

当前阶段 `libs/billing` 不直接绑定 Expo / React Native 依赖，而是通过 adapter 注入真实 SDK。第 4 阶段 `apps/mobile` 会把 RevenueCat / Superwall 的实际实现注册到这里。

```tsx
import { registerMobileBillingAdapter } from '@libs/billing'
import { Provider, useCustomer, usePaywall } from '@libs/billing/mobile'

registerMobileBillingAdapter('revenuecat', {
  Provider: ({ children }) => children,
  useCustomer: () => ({
    customer: null,
    entitlements: [],
    identify: () => undefined,
    reset: () => undefined,
    linkToPortal: async () => undefined
  }),
  usePaywall: () => ({
    present: async () => undefined,
    result: 'idle'
  })
})
```

## 数据库

本阶段新增了 `libs/pg-dao/src/models/billing.prisma`，会生成以下核心模型：

- `BillingCustomer`
- `BillingSubscription`
- `BillingOrder`
- `BillingWebhookEvent`

## 验证

```bash
pnpm exec prisma generate --schema /Users/key7men/Github/ray/libs/pg-dao/src/schema.prisma
pnpm nx run billing:lint
pnpm nx run billing:typecheck
pnpm nx run billing:test
```
