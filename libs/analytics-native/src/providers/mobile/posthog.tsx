import { AnalyticsProvider, createMobileStrategy } from '@libs/analytics'

export const posthogMobileStrategy = createMobileStrategy(AnalyticsProvider.POSTHOG)
