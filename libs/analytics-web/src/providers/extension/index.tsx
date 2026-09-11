import { selectClientStrategy } from '@libs/analytics'

import { extensionEnv } from '../../env'
import { googleAnalyticsExtensionStrategy } from './google-analytics'
import { posthogExtensionStrategy } from './posthog'

export const strategy = selectClientStrategy(extensionEnv.VITE_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsExtensionStrategy,
  posthog: posthogExtensionStrategy
})
