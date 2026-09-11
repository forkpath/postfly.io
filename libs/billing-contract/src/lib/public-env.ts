function readPublicEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }

  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (
          import.meta as ImportMeta & {
            env?: Record<string, string | undefined>
          }
        ).env
      : undefined

  return viteEnv?.[key]
}

export const publicBillingEnv = {
  VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME: readPublicEnv('VITE_BILLING_STRIPE_PRICE_PREMIUM_LIFETIME'),
  VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY: readPublicEnv('VITE_BILLING_STRIPE_PRICE_PREMIUM_MONTHLY'),
  VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY: readPublicEnv('VITE_BILLING_STRIPE_PRICE_PREMIUM_YEARLY'),
  EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME: readPublicEnv('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_LIFETIME'),
  EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY: readPublicEnv('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_MONTHLY'),
  EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY: readPublicEnv('EXPO_PUBLIC_REVENUECAT_PRODUCT_PREMIUM_YEARLY')
} as const
