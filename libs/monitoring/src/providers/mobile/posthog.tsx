import { createMobileMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const posthogMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.POSTHOG)
