import { createExtensionMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const posthogExtensionMonitoringStrategy = createExtensionMonitoringStrategy(MonitoringProvider.POSTHOG)
