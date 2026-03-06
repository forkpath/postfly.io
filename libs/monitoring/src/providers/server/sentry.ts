import type { MonitoringServerStrategy } from '../../lib/types'

import * as Sentry from '@sentry/node'

import { serverEnv } from '../../env'

let initialized = false

export const sentryMonitoringServerStrategy = {
  captureException: (error, extra) => {
    Sentry.captureException(error, {
      extra
    })
  },
  initialize: () => {
    if (initialized || !serverEnv.SENTRY_DSN) {
      return
    }

    Sentry.init({
      dsn: serverEnv.SENTRY_DSN,
      environment: serverEnv.SENTRY_ENVIRONMENT,
      sendDefaultPii: true,
      tracesSampleRate: 1
    })

    initialized = true
  }
} satisfies MonitoringServerStrategy
