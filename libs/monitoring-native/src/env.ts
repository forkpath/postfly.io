import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

// Module-local typing preserves the static syntax required by Expo.
declare const process: {
  env: {
    EXPO_PUBLIC_MONITORING_PROVIDER?: string
    EXPO_PUBLIC_SENTRY_DSN?: string
    EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string
  }
}

export const mobilePreset = {
  id: 'monitoring-mobile',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_MONITORING_PROVIDER: z.enum(['posthog', 'sentry']).default('sentry'),
    EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: z.string().default('development')
  }
} as const satisfies Preset

// Static Expo property access is required for Metro to inline public values.
export const mobileEnv = defineEnv({
  ...mobilePreset,
  env: {
    EXPO_PUBLIC_MONITORING_PROVIDER: process.env.EXPO_PUBLIC_MONITORING_PROVIDER,
    EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT
  }
})
