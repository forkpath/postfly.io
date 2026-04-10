import { createDesktopMonitoringStrategy } from '../../lib/adapter'
import { MonitoringProvider } from '../../lib/types'

export const sentryDesktopMonitoringStrategy = createDesktopMonitoringStrategy(MonitoringProvider.SENTRY)
