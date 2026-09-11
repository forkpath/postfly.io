import { AnalyticsProvider, createMobileStrategy } from '@libs/analytics'

export const googleAnalyticsMobileStrategy = createMobileStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
