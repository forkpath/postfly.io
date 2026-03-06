import type { MonitoringProviderStrategy } from '../../lib/types'

import * as Sentry from '@sentry/react'

import { webEnv } from '../../env'

let initialized = false

export const sentryMonitoringStrategy = {
  Provider: ({ children }) => children,
  captureException: (error, extra) => {
    Sentry.captureException(error, {
      extra
    })
  },
  identify: info => {
    if (!webEnv.VITE_SENTRY_DSN) {
      return
    }

    if (!info) {
      Sentry.setUser(null)
      return
    }

    Sentry.setUser({
      id: info.id,
      email: info.email,
      username: info.name
    })
  },
  initialize: () => {
    if (initialized || !webEnv.VITE_SENTRY_DSN || typeof window === 'undefined') {
      return
    }

    Sentry.init({
      dsn: webEnv.VITE_SENTRY_DSN,
      environment: webEnv.VITE_SENTRY_ENVIRONMENT,
      sendDefaultPii: true,
      tracesSampleRate: 1
    })

    initialized = true
  }
} satisfies MonitoringProviderStrategy
