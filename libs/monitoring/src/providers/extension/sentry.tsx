import { createExtensionMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const sentryExtensionMonitoringStrategy = createExtensionMonitoringStrategy(MonitoringProvider.SENTRY)
