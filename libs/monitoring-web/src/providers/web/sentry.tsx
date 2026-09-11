import { createWebMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const sentryMonitoringStrategy = createWebMonitoringStrategy(MonitoringProvider.SENTRY)
