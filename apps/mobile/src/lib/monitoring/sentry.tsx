import type { MonitoringMobileAdapter } from '@libs/monitoring'

import * as Sentry from '@sentry/react-native'

import { registerMobileMonitoringAdapter } from '@libs/monitoring'

const adapter: MonitoringMobileAdapter = {
  Provider: ({ children }) => children,
  initialize: () => {
    if (Sentry.getClient()) return

    const dsn = process.env['EXPO_PUBLIC_SENTRY_DSN']
    if (!dsn) return

    Sentry.init({
      dsn,
      environment: process.env['EXPO_PUBLIC_SENTRY_ENVIRONMENT'] ?? 'development',
      tracesSampleRate: 1.0,
      enableAutoSessionTracking: true,
      attachScreenshot: true
    })
  },
  identify: info => {
    Sentry.setUser(info ? { id: info.id, email: info.email, username: info.name } : null)
  },
  captureException: (error, extra) => {
    Sentry.captureException(error, { extra })
  }
}

registerMobileMonitoringAdapter('sentry', adapter)
