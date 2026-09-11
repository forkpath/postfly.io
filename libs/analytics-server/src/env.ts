import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

export const serverPreset = {
  id: 'analytics-server',
  server: {
    ANALYTICS_PROVIDER: z.enum(['posthog', 'google-analytics']).default('posthog'),
    POSTHOG_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    GOOGLE_ANALYTICS_SECRET: z.string().optional(),
    GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional()
  }
} as const satisfies Preset

// Server credentials are only read in this Node runtime project.
export const serverEnv = defineEnv({
  ...serverPreset,
  env: {
    ANALYTICS_PROVIDER: process.env['ANALYTICS_PROVIDER'],
    POSTHOG_KEY: process.env['POSTHOG_KEY'],
    POSTHOG_HOST: process.env['POSTHOG_HOST'],
    GOOGLE_ANALYTICS_SECRET: process.env['GOOGLE_ANALYTICS_SECRET'],
    GOOGLE_ANALYTICS_MEASUREMENT_ID:
      process.env['GOOGLE_ANALYTICS_MEASUREMENT_ID'] ?? process.env['VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID']
  }
})
