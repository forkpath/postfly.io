import { AnalyticsProvider, createDesktopStrategy } from '@libs/analytics'

export const posthogDesktopStrategy = createDesktopStrategy(AnalyticsProvider.POSTHOG)
