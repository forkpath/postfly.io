import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

// Only explicitly public Vite variables are read, including during SSR.
function readPublicEnv(key: string): string | undefined {
  const vite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return vite?.[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined)
}

export const webPreset = {
  id: 'analytics-web',
  clientPrefix: 'VITE_',
  client: {
    VITE_ANALYTICS_PROVIDER: z.enum(['posthog', 'google-analytics']).default('posthog'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional()
  }
} as const satisfies Preset

export const webEnv = defineEnv({
  ...webPreset,
  env: {
    VITE_ANALYTICS_PROVIDER: readPublicEnv('VITE_ANALYTICS_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: readPublicEnv('VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID')
  }
})

export const desktopPreset = {
  id: 'analytics-desktop',
  clientPrefix: 'VITE_',
  client: {
    VITE_ANALYTICS_PROVIDER: z.enum(['posthog', 'google-analytics']).default('posthog'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional()
  }
} as const satisfies Preset

export const desktopEnv = defineEnv({
  ...desktopPreset,
  env: {
    VITE_ANALYTICS_PROVIDER: readPublicEnv('VITE_ANALYTICS_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: readPublicEnv('VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID')
  }
})

export const extensionPreset = {
  id: 'analytics-extension',
  clientPrefix: 'VITE_',
  client: {
    VITE_ANALYTICS_PROVIDER: z.enum(['posthog', 'google-analytics']).default('posthog'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional()
  }
} as const satisfies Preset

export const extensionEnv = defineEnv({
  ...extensionPreset,
  env: {
    VITE_ANALYTICS_PROVIDER: readPublicEnv('VITE_ANALYTICS_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: readPublicEnv('VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID')
  }
})
