import { createExtensionMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const sentryExtensionMonitoringStrategy = createExtensionMonitoringStrategy(MonitoringProvider.SENTRY)
