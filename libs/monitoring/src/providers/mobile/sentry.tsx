import { MonitoringProvider } from '../../lib/types'
import { createMobileMonitoringStrategy } from '../../mobile-adapter'

export const sentryMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.SENTRY)
