import { AnalyticsProvider } from '../../lib/types'
import { createMobileStrategy } from '../../mobile-adapter'

export const googleAnalyticsMobileStrategy = createMobileStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
