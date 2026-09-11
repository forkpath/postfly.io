import { createDesktopMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const posthogDesktopMonitoringStrategy = createDesktopMonitoringStrategy(MonitoringProvider.POSTHOG)
