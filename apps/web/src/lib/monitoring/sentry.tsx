import type { MonitoringWebAdapter } from '@libs/monitoring'

import * as Sentry from '@sentry/react'

import { registerWebMonitoringAdapter } from '@libs/monitoring'

const adapter: MonitoringWebAdapter = {
  Provider: ({ children }) => (
    <Sentry.ErrorBoundary fallback={<p>An error has occurred</p>}>{children}</Sentry.ErrorBoundary>
  ),
  initialize: () => {
    if (Sentry.getClient()) return

    const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
    if (!dsn) return

    Sentry.init({
      dsn,
      environment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string) ?? 'development',
      integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
      tracesSampleRate: 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0
    })
  },
  identify: info => {
    Sentry.setUser(info ? { id: info.id, email: info.email, username: info.name } : null)
  },
  captureException: (error, extra) => {
    Sentry.captureException(error, { extra })
  }
}

registerWebMonitoringAdapter('sentry', adapter)
