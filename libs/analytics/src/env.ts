import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { AnalyticsProvider } from './lib/types'

const analyticsProviderSchema = z
  .enum([AnalyticsProvider.POSTHOG, AnalyticsProvider.GOOGLE_ANALYTICS] as const)
  .default(AnalyticsProvider.POSTHOG)

function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }

  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (
          import.meta as ImportMeta & {
            env?: Record<string, string | undefined>
          }
        ).env
      : undefined

  if (viteEnv) {
    return viteEnv[key]
  }

  return undefined
}

/* ── Shared client schema (Vite-based platforms) ── */

const viteClientSchema = {
  VITE_ANALYTICS_PROVIDER: analyticsProviderSchema,
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com'),
  VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: z.string().optional()
}

function resolveViteClientEnv() {
  return {
    VITE_ANALYTICS_PROVIDER: getEnvVar('VITE_ANALYTICS_PROVIDER'),
    VITE_POSTHOG_KEY: getEnvVar('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: getEnvVar('VITE_POSTHOG_HOST'),
    VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID: getEnvVar('VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID')
  }
}

/* ── Server ── */

export const serverPreset = {
  id: 'analytics-server',
  server: {
    ANALYTICS_PROVIDER: analyticsProviderSchema,
    POSTHOG_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com'),
    GOOGLE_ANALYTICS_SECRET: z.string().optional()
  }
} as const satisfies Preset

/* ── Web (TanStack Start / Vite SSR) ── */

export const webPreset = {
  id: 'analytics-web',
  clientPrefix: 'VITE_',
  extends: [serverPreset],
  client: viteClientSchema
} as const satisfies Preset

/* ── Mobile (Expo / React Native) ── */

export const mobilePreset = {
  id: 'analytics-mobile',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_ANALYTICS_PROVIDER: analyticsProviderSchema,
    EXPO_PUBLIC_POSTHOG_KEY: z.string().optional(),
    EXPO_PUBLIC_POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com')
  }
} as const satisfies Preset

/* ── Desktop (Electron + Vite renderer) ── */

export const desktopPreset = {
  id: 'analytics-desktop',
  clientPrefix: 'VITE_',
  client: viteClientSchema
} as const satisfies Preset

/* ── Extension (WXT + Vite) ── */

export const extensionPreset = {
  id: 'analytics-extension',
  clientPrefix: 'VITE_',
  client: viteClientSchema
} as const satisfies Preset

/* ── Env instances ── */

export const serverEnv = defineEnv({
  ...serverPreset,
  env: {
    ANALYTICS_PROVIDER: getEnvVar('ANALYTICS_PROVIDER'),
    POSTHOG_KEY: getEnvVar('POSTHOG_KEY'),
    POSTHOG_HOST: getEnvVar('POSTHOG_HOST'),
    GOOGLE_ANALYTICS_SECRET: getEnvVar('GOOGLE_ANALYTICS_SECRET')
  }
})

export const webEnv = defineEnv({
  ...webPreset,
  env: {
    ANALYTICS_PROVIDER: getEnvVar('ANALYTICS_PROVIDER'),
    POSTHOG_KEY: getEnvVar('POSTHOG_KEY'),
    POSTHOG_HOST: getEnvVar('POSTHOG_HOST'),
    GOOGLE_ANALYTICS_SECRET: getEnvVar('GOOGLE_ANALYTICS_SECRET'),
    ...resolveViteClientEnv()
  }
})

export const mobileEnv = defineEnv({
  ...mobilePreset,
  env: {
    EXPO_PUBLIC_ANALYTICS_PROVIDER: getEnvVar('EXPO_PUBLIC_ANALYTICS_PROVIDER'),
    EXPO_PUBLIC_POSTHOG_KEY: getEnvVar('EXPO_PUBLIC_POSTHOG_KEY'),
    EXPO_PUBLIC_POSTHOG_HOST: getEnvVar('EXPO_PUBLIC_POSTHOG_HOST')
  }
})

export const desktopEnv = defineEnv({
  ...desktopPreset,
  env: resolveViteClientEnv()
})

export const extensionEnv = defineEnv({
  ...extensionPreset,
  env: resolveViteClientEnv()
})
