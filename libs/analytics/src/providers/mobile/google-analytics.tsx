import { createMobileStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const googleAnalyticsMobileStrategy = createMobileStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
