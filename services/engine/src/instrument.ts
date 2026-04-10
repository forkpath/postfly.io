import * as Sentry from '@sentry/nestjs'

import { registerServerMonitoringAdapter } from '@libs/monitoring'

const dsn = process.env['SENTRY_DSN']
const environment = process.env['SENTRY_ENVIRONMENT'] ?? 'development'

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: 1.0
  })
}

registerServerMonitoringAdapter('sentry', {
  initialize: () => {
    /* already initialized above — must run before NestFactory.create */
  },
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => {
    Sentry.captureException(error, { extra })
  }
})
