import { createExtensionAnalyticsStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const posthogExtensionStrategy = createExtensionAnalyticsStrategy(AnalyticsProvider.POSTHOG)
