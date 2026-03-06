import { AnalyticsProvider } from '../../lib/types'
import { createMobileStrategy } from '../../mobile-adapter'

export const posthogMobileStrategy = createMobileStrategy(AnalyticsProvider.POSTHOG)
