import { createDesktopStrategy } from '../../lib/adapter'
import { AnalyticsProvider } from '../../lib/types'

export const googleAnalyticsDesktopStrategy = createDesktopStrategy(AnalyticsProvider.GOOGLE_ANALYTICS)
