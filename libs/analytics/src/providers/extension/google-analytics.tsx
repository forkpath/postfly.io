import { createExtensionAnalyticsStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const googleAnalyticsExtensionStrategy = createExtensionAnalyticsStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
