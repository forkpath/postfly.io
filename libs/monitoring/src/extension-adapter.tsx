import type { ReactNode } from 'react'
import type { MonitoringIdentity, MonitoringProviderName, MonitoringProviderStrategy } from './lib/types'

import { MonitoringProvider } from './lib/types'

export interface MonitoringExtensionAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => void
  identify: (info: MonitoringIdentity | null) => void
  initialize: () => void | Promise<void>
}

const adapters: Partial<Record<MonitoringProviderName, MonitoringExtensionAdapter>> = {}

const fallbackStrategy: MonitoringProviderStrategy = {
  Provider: ({ children }) => children,
  captureException: () => undefined,
  identify: () => undefined,
  initialize: () => undefined
}

export function registerExtensionMonitoringAdapter(
  provider: MonitoringProviderName,
  adapter: MonitoringExtensionAdapter
) {
  adapters[provider] = adapter
}

export function clearExtensionMonitoringAdapters() {
  adapters[MonitoringProvider.POSTHOG] = undefined
  adapters[MonitoringProvider.SENTRY] = undefined
}

export function createExtensionMonitoringStrategy(provider: MonitoringProviderName): MonitoringProviderStrategy {
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
