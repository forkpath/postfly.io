import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

const booleanEnv = z
  .enum(['true', 'false'])
  .default('false')
  .transform(value => value === 'true')

export const serverPreset = {
  id: 'billing-server',
  server: {
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    REVENUECAT_API_KEY: z.string().optional(),
    REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
    BILLING_OWNER_V2_DUAL_WRITE: booleanEnv,
    BILLING_OWNER_V2_SHADOW_READ: booleanEnv,
    BILLING_OWNER_V2_READ: booleanEnv,
    ORGANIZATION_BILLING_ENABLED: booleanEnv
  }
} as const satisfies Preset

export const serverEnv = defineEnv(serverPreset)

export interface BillingRolloutConfiguration {
  BILLING_OWNER_V2_DUAL_WRITE: boolean
  BILLING_OWNER_V2_SHADOW_READ: boolean
  BILLING_OWNER_V2_READ: boolean
  ORGANIZATION_BILLING_ENABLED: boolean
}

export function assertBillingRolloutConfiguration(configuration: BillingRolloutConfiguration): void {
  if (configuration.BILLING_OWNER_V2_SHADOW_READ && !configuration.BILLING_OWNER_V2_DUAL_WRITE) {
    throw new Error('BILLING_OWNER_V2_SHADOW_READ requires BILLING_OWNER_V2_DUAL_WRITE')
  }

  if (configuration.BILLING_OWNER_V2_READ && !configuration.BILLING_OWNER_V2_SHADOW_READ) {
    throw new Error('BILLING_OWNER_V2_READ requires BILLING_OWNER_V2_SHADOW_READ')
  }

  if (configuration.ORGANIZATION_BILLING_ENABLED && !configuration.BILLING_OWNER_V2_READ) {
    throw new Error('ORGANIZATION_BILLING_ENABLED requires BILLING_OWNER_V2_READ')
  }
}

assertBillingRolloutConfiguration(serverEnv)
