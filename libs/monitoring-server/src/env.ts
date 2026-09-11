import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

export const serverPreset = {
  id: 'monitoring-server',
  server: {
    MONITORING_PROVIDER: z.enum(['posthog', 'sentry']).default('sentry'),
    POSTHOG_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().default('development')
  }
} as const satisfies Preset

// Server credentials are only read in this Node runtime project.
export const serverEnv = defineEnv({
  ...serverPreset,
  env: {
    MONITORING_PROVIDER: process.env['MONITORING_PROVIDER'],
    POSTHOG_KEY: process.env['POSTHOG_KEY'],
    POSTHOG_HOST: process.env['POSTHOG_HOST'],
    SENTRY_DSN: process.env['SENTRY_DSN'],
    SENTRY_ENVIRONMENT: process.env['SENTRY_ENVIRONMENT']
  }
})
