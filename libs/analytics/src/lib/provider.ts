import type { AnalyticsProviderClientStrategy, AnalyticsProviderName, AnalyticsProviderServerStrategy } from './types'

import { AnalyticsProvider } from './types'

const clientNoop: AnalyticsProviderClientStrategy = {
  Provider: ({ children }) => children,
  track: () => undefined,
  identify: () => undefined,
  reset: () => undefined
}

const serverNoop: AnalyticsProviderServerStrategy = {
  track: () => undefined
}

export function normalizeAnalyticsProvider(value: string | undefined): AnalyticsProviderName {
  return value === AnalyticsProvider.GOOGLE_ANALYTICS ? AnalyticsProvider.GOOGLE_ANALYTICS : AnalyticsProvider.POSTHOG
}

export function selectClientStrategy(
  provider: string | undefined,
  strategies: Partial<Record<AnalyticsProviderName, AnalyticsProviderClientStrategy>>
): AnalyticsProviderClientStrategy {
  return strategies[normalizeAnalyticsProvider(provider)] ?? clientNoop
}

export function selectServerStrategy(
  provider: string | undefined,
  strategies: Partial<Record<AnalyticsProviderName, AnalyticsProviderServerStrategy>>
): AnalyticsProviderServerStrategy {
  return strategies[normalizeAnalyticsProvider(provider)] ?? serverNoop
}
