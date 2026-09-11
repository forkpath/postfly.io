import { AnalyticsProvider, createExtensionAnalyticsStrategy } from '@libs/analytics'

export const posthogExtensionStrategy = createExtensionAnalyticsStrategy(AnalyticsProvider.POSTHOG)
