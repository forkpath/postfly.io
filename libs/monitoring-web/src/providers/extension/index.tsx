import { selectMonitoringClientStrategy } from '@libs/monitoring'

import { extensionEnv } from '../../env'
import { posthogExtensionMonitoringStrategy } from './posthog'
import { sentryExtensionMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(extensionEnv.VITE_MONITORING_PROVIDER, {
  posthog: posthogExtensionMonitoringStrategy,
  sentry: sentryExtensionMonitoringStrategy
})
