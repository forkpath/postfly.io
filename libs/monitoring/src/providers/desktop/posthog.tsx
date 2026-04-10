import { createDesktopMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const posthogDesktopMonitoringStrategy = createDesktopMonitoringStrategy(MonitoringProvider.POSTHOG)
