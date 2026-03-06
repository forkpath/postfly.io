import type { ReactNode } from 'react'
import type { AllowedPropertyValues, AnalyticsProviderClientStrategy, AnalyticsProviderName } from './lib/types'

import { AnalyticsProvider } from './lib/types'

export interface AnalyticsMobileAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  track: (event: string, data?: Record<string, AllowedPropertyValues>) => void
  identify: (userId: string, traits?: Record<string, AllowedPropertyValues>) => void
  reset: () => void
}

const adapters: Partial<Record<AnalyticsProviderName, AnalyticsMobileAdapter>> = {}

const fallbackStrategy: AnalyticsProviderClientStrategy = {
  Provider: ({ children }) => children,
  track: () => undefined,
  identify: () => undefined,
  reset: () => undefined
}

export function registerMobileAnalyticsAdapter(provider: AnalyticsProviderName, adapter: AnalyticsMobileAdapter) {
  adapters[provider] = adapter
}

export function clearMobileAnalyticsAdapters() {
  adapters[AnalyticsProvider.POSTHOG] = undefined
  adapters[AnalyticsProvider.GOOGLE_ANALYTICS] = undefined
}

export function createMobileStrategy(provider: AnalyticsProviderName): AnalyticsProviderClientStrategy {
  const adapter = adapters[provider]

  if (!adapter) {
    return fallbackStrategy
  }

  return {
    Provider: ({ children }) => {
      if (!adapter.Provider) {
        return children
      }

      return <adapter.Provider>{children}</adapter.Provider>
    },
    track: adapter.track,
    identify: adapter.identify,
    reset: adapter.reset
  }
}
