import { createMobileMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const sentryMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.SENTRY)
