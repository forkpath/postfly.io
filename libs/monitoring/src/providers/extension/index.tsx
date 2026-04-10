import { extensionEnv } from '../../env'
import { selectMonitoringClientStrategy } from '../../lib/provider'
import { posthogExtensionMonitoringStrategy } from './posthog'
import { sentryExtensionMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(extensionEnv.VITE_MONITORING_PROVIDER, {
  posthog: posthogExtensionMonitoringStrategy,
  sentry: sentryExtensionMonitoringStrategy
})
