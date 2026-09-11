import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

// Only explicitly public Vite variables are read, including during SSR.
function readPublicEnv(key: string): string | undefined {
  const vite = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return vite?.[key] ?? (typeof process !== 'undefined' ? process.env[key] : undefined)
}

export const webPreset = {
  id: 'monitoring-web',
  clientPrefix: 'VITE_',
  client: {
    VITE_MONITORING_PROVIDER: z.enum(['posthog', 'sentry']).default('sentry'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_SENTRY_ENVIRONMENT: z.string().default('development'),
    VITE_SENTRY_DSN: z.string().optional()
  }
} as const satisfies Preset

export const webEnv = defineEnv({
  ...webPreset,
  env: {
    VITE_MONITORING_PROVIDER: readPublicEnv('VITE_MONITORING_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_SENTRY_ENVIRONMENT: readPublicEnv('VITE_SENTRY_ENVIRONMENT'),
    VITE_SENTRY_DSN: readPublicEnv('VITE_SENTRY_DSN')
  }
})

export const desktopPreset = {
  id: 'monitoring-desktop',
  clientPrefix: 'VITE_',
  client: {
    VITE_MONITORING_PROVIDER: z.enum(['posthog', 'sentry']).default('sentry'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_SENTRY_ENVIRONMENT: z.string().default('development'),
    VITE_SENTRY_DESKTOP_DSN: z.string().optional()
  }
} as const satisfies Preset

export const desktopEnv = defineEnv({
  ...desktopPreset,
  env: {
    VITE_MONITORING_PROVIDER: readPublicEnv('VITE_MONITORING_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_SENTRY_ENVIRONMENT: readPublicEnv('VITE_SENTRY_ENVIRONMENT'),
    VITE_SENTRY_DESKTOP_DSN: readPublicEnv('VITE_SENTRY_DESKTOP_DSN')
  }
})

export const extensionPreset = {
  id: 'monitoring-extension',
  clientPrefix: 'VITE_',
  client: {
    VITE_MONITORING_PROVIDER: z.enum(['posthog', 'sentry']).default('sentry'),
    VITE_POSTHOG_KEY: z.string().optional(),
    VITE_POSTHOG_HOST: z.string().default('https://us.i.posthog.com'),
    VITE_SENTRY_ENVIRONMENT: z.string().default('development'),
    VITE_SENTRY_EXTENSION_DSN: z.string().optional()
  }
} as const satisfies Preset

export const extensionEnv = defineEnv({
  ...extensionPreset,
  env: {
    VITE_MONITORING_PROVIDER: readPublicEnv('VITE_MONITORING_PROVIDER'),
    VITE_POSTHOG_KEY: readPublicEnv('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: readPublicEnv('VITE_POSTHOG_HOST'),
    VITE_SENTRY_ENVIRONMENT: readPublicEnv('VITE_SENTRY_ENVIRONMENT'),
    VITE_SENTRY_EXTENSION_DSN: readPublicEnv('VITE_SENTRY_EXTENSION_DSN')
  }
})
