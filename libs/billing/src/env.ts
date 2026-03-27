import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { BillingProvider } from './lib/types'

function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }

  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined

  if (viteEnv) {
    return viteEnv[key]
  }

  return undefined
}

const mobileProviderSchema = z
  .enum([BillingProvider.REVENUECAT, BillingProvider.SUPERWALL] as const)
  .default(BillingProvider.REVENUECAT)

export const serverPreset = {
  id: 'billing-server',
  server: {
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional()
  }
} as const satisfies Preset

export const webPreset = {
  id: 'billing-web',
  clientPrefix: 'VITE_',
  extends: [serverPreset],
  client: {
    VITE_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME: z.string().optional(),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY: z.string().optional(),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY: z.string().optional()
  }
} as const satisfies Preset

export const mobilePreset = {
  id: 'billing-mobile',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_BILLING_MOBILE_PROVIDER: mobileProviderSchema,
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY: z.string().optional(),
    EXPO_PUBLIC_SUPERWALL_API_KEY: z.string().optional(),
    EXPO_PUBLIC_SUPERWALL_PLACEMENT_PREMIUM: z.string().optional()
  }
} as const satisfies Preset

export const serverEnv = defineEnv({
  ...serverPreset,
  env: {
    STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET')
  }
})

export const webEnv = defineEnv({
  ...webPreset,
  env: {
    STRIPE_SECRET_KEY: getEnvVar('STRIPE_SECRET_KEY'),
    STRIPE_WEBHOOK_SECRET: getEnvVar('STRIPE_WEBHOOK_SECRET'),
    VITE_STRIPE_PUBLISHABLE_KEY: getEnvVar('VITE_STRIPE_PUBLISHABLE_KEY'),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME: getEnvVar('VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME'),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY: getEnvVar('VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY'),
    VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY: getEnvVar('VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY')
  }
})

export const mobileEnv = defineEnv({
  ...mobilePreset,
  env: {
    EXPO_PUBLIC_BILLING_MOBILE_PROVIDER: getEnvVar('EXPO_PUBLIC_BILLING_MOBILE_PROVIDER'),
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: getEnvVar('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY'),
    EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: getEnvVar('EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY'),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME: getEnvVar('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME'),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY: getEnvVar('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY'),
    EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY: getEnvVar('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY'),
    EXPO_PUBLIC_SUPERWALL_API_KEY: getEnvVar('EXPO_PUBLIC_SUPERWALL_API_KEY'),
    EXPO_PUBLIC_SUPERWALL_PLACEMENT_PREMIUM: getEnvVar('EXPO_PUBLIC_SUPERWALL_PLACEMENT_PREMIUM')
  }
})
