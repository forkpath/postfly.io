import { AnalyticsProvider, registerExtensionAnalyticsAdapter } from '@libs/analytics'

import { posthogAnalyticsAdapter } from './posthog'

registerExtensionAnalyticsAdapter(AnalyticsProvider.POSTHOG, posthogAnalyticsAdapter)
