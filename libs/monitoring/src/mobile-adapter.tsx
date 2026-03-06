import type { ReactNode } from 'react'
import type { MonitoringIdentity, MonitoringProviderName, MonitoringProviderStrategy } from './lib/types'

import { MonitoringProvider } from './lib/types'

export interface MonitoringMobileAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => void
  identify: (info: MonitoringIdentity | null) => void
  initialize: () => void | Promise<void>
}

const adapters: Partial<Record<MonitoringProviderName, MonitoringMobileAdapter>> = {}

const fallbackStrategy: MonitoringProviderStrategy = {
  Provider: ({ children }) => children,
  captureException: () => undefined,
  identify: () => undefined,
  initialize: () => undefined
}

export function registerMobileMonitoringAdapter(provider: MonitoringProviderName, adapter: MonitoringMobileAdapter) {
  adapters[provider] = adapter
}

export function clearMobileMonitoringAdapters() {
  adapters[MonitoringProvider.POSTHOG] = undefined
  adapters[MonitoringProvider.SENTRY] = undefined
}

export function createMobileMonitoringStrategy(provider: MonitoringProviderName): MonitoringProviderStrategy {
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
    captureException: adapter.captureException,
    identify: adapter.identify,
    initialize: adapter.initialize
  }
}
