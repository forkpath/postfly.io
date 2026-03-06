import { mobileEnv } from '../../env'
import { selectClientStrategy } from '../../lib/provider'
import { googleAnalyticsMobileStrategy } from './google-analytics'
import { posthogMobileStrategy } from './posthog'

export const strategy = selectClientStrategy(mobileEnv.EXPO_PUBLIC_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsMobileStrategy,
  posthog: posthogMobileStrategy
})
