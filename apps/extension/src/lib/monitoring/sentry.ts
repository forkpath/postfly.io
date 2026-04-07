import type { MonitoringExtensionAdapter } from '@libs/monitoring'

import * as Sentry from '@sentry/browser'

export const sentryMonitoringAdapter: MonitoringExtensionAdapter = {
  captureException: exception => {
    Sentry.captureException(exception)
  },
  identify: user => {
    Sentry.setUser(user)
  },
  initialize: () => {
    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
    if (!dsn) return

    Sentry.init({
      dsn,
      environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) ?? 'development',
      integrations: [],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: true
    })
  }
}
