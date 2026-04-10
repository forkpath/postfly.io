import { createWebMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const sentryMonitoringStrategy = createWebMonitoringStrategy(MonitoringProvider.SENTRY)
