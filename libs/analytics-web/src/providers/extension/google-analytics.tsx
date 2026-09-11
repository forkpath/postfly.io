import { AnalyticsProvider, createExtensionAnalyticsStrategy } from '@libs/analytics'

export const googleAnalyticsExtensionStrategy = createExtensionAnalyticsStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
