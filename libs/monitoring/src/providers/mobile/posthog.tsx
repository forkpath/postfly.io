import { MonitoringProvider } from '../../lib/types'
import { createMobileMonitoringStrategy } from '../../mobile-adapter'

export const posthogMobileMonitoringStrategy = createMobileMonitoringStrategy(MonitoringProvider.POSTHOG)
