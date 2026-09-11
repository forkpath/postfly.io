import { selectClientStrategy } from '@libs/analytics'

import { webEnv } from '../../env'
import { googleAnalyticsClientStrategy } from './google-analytics'
import { posthogClientStrategy } from './posthog'

export const strategy = selectClientStrategy(webEnv.VITE_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsClientStrategy,
  posthog: posthogClientStrategy
})
