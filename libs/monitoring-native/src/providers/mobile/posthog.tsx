import { createMobileMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const posthogMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.POSTHOG)
