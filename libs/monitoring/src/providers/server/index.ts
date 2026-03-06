import { serverEnv } from '../../env'
import { selectMonitoringServerStrategy } from '../../lib/provider'
import { posthogMonitoringServerStrategy } from './posthog'
import { sentryMonitoringServerStrategy } from './sentry'

export const strategy = selectMonitoringServerStrategy(serverEnv.MONITORING_PROVIDER, {
  posthog: posthogMonitoringServerStrategy,
  sentry: sentryMonitoringServerStrategy
})
