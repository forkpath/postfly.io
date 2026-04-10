import { extensionEnv } from '../../env'
import { selectClientStrategy } from '../../lib/provider'
import { googleAnalyticsExtensionStrategy } from './google-analytics'
import { posthogExtensionStrategy } from './posthog'

export const strategy = selectClientStrategy(extensionEnv.VITE_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsExtensionStrategy,
  posthog: posthogExtensionStrategy
})
