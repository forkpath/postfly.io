# Billing

该模块是纯 TypeScript 源码库，不进行打包，应用侧直接通过路径别名引用。

## 目录结构

- `libs/billing/src/common`：原 `billing/shared`，通用类型、配置、工具、服务端数据访问。
- `libs/billing/src/mobile`：移动端（React Native）能力，仅保留 RevenueCat provider。
- `libs/billing/src/web`：Web 端能力，仅保留 Stripe provider。

## 使用方式

### 通用（common）

```ts
import { config, SubscriptionStatus } from "@libs/billing/common";
import { getCustomerByExternalId } from "@libs/billing/common/server";
```

### 移动端（mobile）

```tsx
import { Provider, useCustomer, usePaywall } from "@libs/billing/mobile";
```

### Web 端（web）

```ts
import { webhookHandler } from "@libs/billing/web/server";
import { stripe } from "@libs/billing/web/providers/stripe";
```

## 说明

- 本库以源码形式被应用引用，无需额外构建步骤。
- `@libs/billing/common` 对应原 `billing/shared`。
- 所有日志统一使用 `console`。
