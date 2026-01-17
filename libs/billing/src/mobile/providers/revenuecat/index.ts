import type { BillingProviderClientStrategy } from '../types'

import { BillingProvider } from '../types'
import { useCustomer } from './hooks/use-customer'
import { usePaywall } from './hooks/use-paywall'
import { Provider } from './provider'

export const strategy = {
  provider: BillingProvider.REVENUECAT,
  Provider,
  useCustomer,
  usePaywall
} as const satisfies BillingProviderClientStrategy

export * from './env'
