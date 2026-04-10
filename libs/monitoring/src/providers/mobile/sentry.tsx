import { createMobileMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const sentryMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.SENTRY)
