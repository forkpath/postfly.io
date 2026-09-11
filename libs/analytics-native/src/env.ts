import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

// Module-local typing preserves the static syntax required by Expo.
declare const process: {
  env: {
    EXPO_PUBLIC_ANALYTICS_PROVIDER?: string
    EXPO_PUBLIC_POSTHOG_KEY?: string
    EXPO_PUBLIC_POSTHOG_HOST?: string
  }
}

export const mobilePreset = {
  id: 'analytics-mobile',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_ANALYTICS_PROVIDER: z.enum(['posthog', 'google-analytics']).default('posthog'),
    EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
    EXPO_PUBLIC_POSTHOG_HOST: z.string().default('https://us.i.posthog.com')
  }
} as const satisfies Preset

// Static Expo property access is required for Metro to inline public values.
export const mobileEnv = defineEnv({
  ...mobilePreset,
  env: {
    EXPO_PUBLIC_ANALYTICS_PROVIDER: process.env.EXPO_PUBLIC_ANALYTICS_PROVIDER,
    EXPO_PUBLIC_POSTHOG_KEY: process.env.EXPO_PUBLIC_POSTHOG_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST
  }
})
