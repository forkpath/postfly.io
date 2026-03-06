import { webEnv } from '../../env'
import { selectClientStrategy } from '../../lib/provider'
import { googleAnalyticsClientStrategy } from './google-analytics'
import { posthogClientStrategy } from './posthog'

export const strategy = selectClientStrategy(webEnv.VITE_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsClientStrategy,
  posthog: posthogClientStrategy
})
