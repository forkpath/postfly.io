import * as Sentry from '@sentry/electron/main'

const dsn = process.env.VITE_SENTRY_DESKTOP_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VITE_SENTRY_ENVIRONMENT ?? 'development',
    tracesSampleRate: 1.0
  })
}
