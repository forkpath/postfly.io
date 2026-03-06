import { mobileEnv } from '../../env'
import { selectMonitoringClientStrategy } from '../../lib/provider'
import { posthogMobileMonitoringStrategy } from './posthog'
import { sentryMobileMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(mobileEnv.EXPO_PUBLIC_MONITORING_PROVIDER, {
  posthog: posthogMobileMonitoringStrategy,
  sentry: sentryMobileMonitoringStrategy
})
