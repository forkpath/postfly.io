import { selectMonitoringClientStrategy } from '@libs/monitoring'

import { desktopEnv } from '../../env'
import { posthogDesktopMonitoringStrategy } from './posthog'
import { sentryDesktopMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(desktopEnv.VITE_MONITORING_PROVIDER, {
  posthog: posthogDesktopMonitoringStrategy,
  sentry: sentryDesktopMonitoringStrategy
})
