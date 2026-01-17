import type { BillingProviderServerStrategy } from '../../types'

import { BillingProvider } from '../../types'
import { webhookHandler } from './webhook'

export const strategy = {
  provider: BillingProvider.REVENUECAT,
  webhookHandler
} as const satisfies BillingProviderServerStrategy
