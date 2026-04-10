import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

import { MonitoringProvider } from './lib/types'

const monitoringProviderSchema = z
  .enum([MonitoringProvider.POSTHOG, MonitoringProvider.SENTRY] as const)
  .default(MonitoringProvider.POSTHOG)

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

/* ── Shared Vite fields (provider + posthog + environment) ── */

const sharedViteFields = {
  VITE_MONITORING_PROVIDER: monitoringProviderSchema,
  VITE_POSTHOG_KEY: z.string().optional(),
  VITE_POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com'),
  VITE_SENTRY_ENVIRONMENT: z.string().optional().default('development')
}

function resolveSharedViteEnv() {
  return {
    VITE_MONITORING_PROVIDER: getEnvVar('VITE_MONITORING_PROVIDER'),
    VITE_POSTHOG_KEY: getEnvVar('VITE_POSTHOG_KEY'),
    VITE_POSTHOG_HOST: getEnvVar('VITE_POSTHOG_HOST'),
    VITE_SENTRY_ENVIRONMENT: getEnvVar('VITE_SENTRY_ENVIRONMENT')
  }
}

/* ── Server ── */

export const serverPreset = {
  id: 'monitoring-server',
  server: {
    MONITORING_PROVIDER: monitoringProviderSchema,
    POSTHOG_KEY: z.string().optional(),
    POSTHOG_HOST: z.string().optional().default('https://us.i.posthog.com'),
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().optional().default('development')
  }
} as const satisfies Preset

/* ── Web (TanStack Start / Vite SSR) ── */

export const webPreset = {
  id: 'monitoring-web',
  clientPrefix: 'VITE_',
  extends: [serverPreset],
  client: {
    ...sharedViteFields,
    VITE_SENTRY_DSN: z.string().optional()
  }
} as const satisfies Preset

/* ── Mobile (Expo / React Native) ── */

export const mobilePreset = {
  id: 'monitoring-mobile',
  clientPrefix: 'EXPO_PUBLIC_',
  client: {
    EXPO_PUBLIC_MONITORING_PROVIDER: monitoringProviderSchema,
    EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: z.string().optional().default('development')
  }
} as const satisfies Preset

/* ── Desktop (Electron + Vite renderer) ── */

export const desktopPreset = {
  id: 'monitoring-desktop',
  clientPrefix: 'VITE_',
  client: {
    ...sharedViteFields,
    VITE_SENTRY_DESKTOP_DSN: z.string().optional()
  }
} as const satisfies Preset

/* ── Extension (WXT + Vite) ── */

export const extensionPreset = {
  id: 'monitoring-extension',
  clientPrefix: 'VITE_',
  client: {
    ...sharedViteFields,
    VITE_SENTRY_EXTENSION_DSN: z.string().optional()
  }
} as const satisfies Preset

/* ── Env instances ── */

export const serverEnv = defineEnv({
  ...serverPreset,
  env: {
    MONITORING_PROVIDER: getEnvVar('MONITORING_PROVIDER'),
    POSTHOG_KEY: getEnvVar('POSTHOG_KEY'),
    POSTHOG_HOST: getEnvVar('POSTHOG_HOST'),
    SENTRY_DSN: getEnvVar('SENTRY_DSN'),
    SENTRY_ENVIRONMENT: getEnvVar('SENTRY_ENVIRONMENT')
  }
})

export const webEnv = defineEnv({
  ...webPreset,
  env: {
    MONITORING_PROVIDER: getEnvVar('MONITORING_PROVIDER'),
    POSTHOG_KEY: getEnvVar('POSTHOG_KEY'),
    POSTHOG_HOST: getEnvVar('POSTHOG_HOST'),
    SENTRY_DSN: getEnvVar('SENTRY_DSN'),
    SENTRY_ENVIRONMENT: getEnvVar('SENTRY_ENVIRONMENT'),
    ...resolveSharedViteEnv(),
    VITE_SENTRY_DSN: getEnvVar('VITE_SENTRY_DSN')
  }
})

export const mobileEnv = defineEnv({
  ...mobilePreset,
  env: {
    EXPO_PUBLIC_MONITORING_PROVIDER: getEnvVar('EXPO_PUBLIC_MONITORING_PROVIDER'),
    EXPO_PUBLIC_SENTRY_DSN: getEnvVar('EXPO_PUBLIC_SENTRY_DSN'),
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: getEnvVar('EXPO_PUBLIC_SENTRY_ENVIRONMENT')
  }
})

export const desktopEnv = defineEnv({
  ...desktopPreset,
  env: {
    ...resolveSharedViteEnv(),
    VITE_SENTRY_DESKTOP_DSN: getEnvVar('VITE_SENTRY_DESKTOP_DSN')
  }
})

export const extensionEnv = defineEnv({
  ...extensionPreset,
  env: {
    ...resolveSharedViteEnv(),
    VITE_SENTRY_EXTENSION_DSN: getEnvVar('VITE_SENTRY_EXTENSION_DSN')
  }
})
