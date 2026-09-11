import { createDesktopMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const sentryDesktopMonitoringStrategy = createDesktopMonitoringStrategy(MonitoringProvider.SENTRY)
