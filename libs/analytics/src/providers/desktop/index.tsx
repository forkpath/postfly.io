import { desktopEnv } from '../../env'
import { selectClientStrategy } from '../../lib/provider'
import { googleAnalyticsDesktopStrategy } from './google-analytics'
import { posthogDesktopStrategy } from './posthog'

export const strategy = selectClientStrategy(desktopEnv.VITE_ANALYTICS_PROVIDER, {
  'google-analytics': googleAnalyticsDesktopStrategy,
  posthog: posthogDesktopStrategy
})
