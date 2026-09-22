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
    ORGANIZATION_BILLING_ENABLED: booleanEnv
  }
} as const satisfies Preset

export const serverEnv = defineEnv(serverPreset)
