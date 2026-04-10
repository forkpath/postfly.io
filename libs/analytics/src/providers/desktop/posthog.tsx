import { createDesktopStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const posthogDesktopStrategy = createDesktopStrategy(AnalyticsProvider.POSTHOG)
