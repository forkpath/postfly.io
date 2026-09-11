import { createServerMonitoringStrategy, MonitoringProvider } from '@libs/monitoring'

export const sentryMonitoringServerStrategy = createServerMonitoringStrategy(MonitoringProvider.SENTRY)
