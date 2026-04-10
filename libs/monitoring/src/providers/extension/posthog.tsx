import { createExtensionMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const posthogExtensionMonitoringStrategy = createExtensionMonitoringStrategy(MonitoringProvider.POSTHOG)
