import type { BillingProviderStrategy } from '../types'

import { BillingProvider } from '../types'
import { checkout, getBillingPortal } from './checkout'
import { webhookHandler } from './webhook'

export const strategy = {
  webhookHandler,
  checkout,
  getBillingPortal,
  provider: BillingProvider.STRIPE
} satisfies BillingProviderStrategy
