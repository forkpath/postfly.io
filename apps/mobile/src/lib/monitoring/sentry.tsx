import type { MonitoringMobileAdapter } from '@libs/monitoring'

import * as Sentry from '@sentry/react-native'
import { isRunningInExpoGo } from 'expo'

import { MonitoringProvider, registerMobileMonitoringAdapter } from '@libs/monitoring'
import { mobileEnv } from '@libs/monitoring/env'

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo()
})

const adapter: MonitoringMobileAdapter = {
  Provider: ({ children }) => <>{children}</>,
  initialize: () => {
    if (Sentry.getClient()) return

    const dsn = mobileEnv.EXPO_PUBLIC_SENTRY_DSN
    if (!dsn) return

    Sentry.init({
      dsn,
      environment: mobileEnv.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
      integrations: [navigationIntegration],
      tracesSampleRate: 1.0,
      enableNativeFramesTracking: !isRunningInExpoGo()
    })
  },
  identify: info => {
    Sentry.setUser(info ? { id: info.id, email: info.email, username: info.name } : null)
  },
  captureException: (error, extra) => {
    Sentry.captureException(error, { extra })
  }
}

registerMobileMonitoringAdapter(MonitoringProvider.SENTRY, adapter)
