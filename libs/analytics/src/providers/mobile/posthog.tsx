import { createMobileStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const posthogMobileStrategy = createMobileStrategy(AnalyticsProvider.POSTHOG)
