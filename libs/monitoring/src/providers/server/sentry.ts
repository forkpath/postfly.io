import { createServerMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const sentryMonitoringServerStrategy = createServerMonitoringStrategy(MonitoringProvider.SENTRY)
