import { desktopEnv } from '../../env'
import { selectMonitoringClientStrategy } from '../../lib/provider'
import { posthogDesktopMonitoringStrategy } from './posthog'
import { sentryDesktopMonitoringStrategy } from './sentry'

export const strategy = selectMonitoringClientStrategy(desktopEnv.VITE_MONITORING_PROVIDER, {
  posthog: posthogDesktopMonitoringStrategy,
  sentry: sentryDesktopMonitoringStrategy
})
