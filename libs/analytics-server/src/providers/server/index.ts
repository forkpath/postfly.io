import { selectServerStrategy } from '@libs/analytics'

import { serverEnv } from '../../env'
import { googleAnalyticsServerStrategy } from './google-analytics'
import { posthogServerStrategy } from './posthog'

export const strategy = selectServerStrategy(serverEnv.ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsServerStrategy,
  posthog: posthogServerStrategy
})
