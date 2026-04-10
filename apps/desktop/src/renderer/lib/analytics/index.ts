import { AnalyticsProvider, registerDesktopAnalyticsAdapter } from '@libs/analytics'

import { posthogDesktopAnalyticsAdapter } from './posthog'

registerDesktopAnalyticsAdapter(AnalyticsProvider.POSTHOG, posthogDesktopAnalyticsAdapter)
