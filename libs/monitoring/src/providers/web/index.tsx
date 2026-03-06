import { webEnv } from '../../env'
import { selectMonitoringClientStrategy } from '../../lib/provider'
import { posthogMonitoringStrategy } from './posthog'
import { sentryMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(webEnv.VITE_MONITORING_PROVIDER, {
  posthog: posthogMonitoringStrategy,
  sentry: sentryMonitoringStrategy
})
