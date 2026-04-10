import type { ReactNode } from 'react'
import type { AllowedPropertyValues, AnalyticsProviderClientStrategy, AnalyticsProviderName } from './types'

export interface AnalyticsPlatformAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  track: (event: string, data?: Record<string, AllowedPropertyValues>) => void
  identify: (userId: string, traits?: Record<string, AllowedPropertyValues>) => void
  reset: () => void
}

const clientNoop: AnalyticsProviderClientStrategy = {
  Provider: ({ children }) => children,
  track: () => undefined,
  identify: () => undefined,
  reset: () => undefined
}

export function createAdapterRegistry() {
  const adapters: Partial<Record<AnalyticsProviderName, AnalyticsPlatformAdapter>> = {}

  function register(provider: AnalyticsProviderName, adapter: AnalyticsPlatformAdapter) {
    adapters[provider] = adapter
  }

  function clear() {
    for (const key of Object.keys(adapters)) {
      delete adapters[key as AnalyticsProviderName]
    }
  }

  function createStrategy(provider: AnalyticsProviderName): AnalyticsProviderClientStrategy {
    const adapter = adapters[provider]

    if (!adapter) {
      return clientNoop
    }

    return {
      Provider: ({ children }) => (adapter.Provider ? <adapter.Provider>{children}</adapter.Provider> : children),
      track: adapter.track,
      identify: adapter.identify,
      reset: adapter.reset
    }
  }

  return { register, clear, createStrategy }
}

/* ── Platform-specific registries ── */

export const mobileAdapters = createAdapterRegistry()
export const desktopAdapters = createAdapterRegistry()
export const extensionAdapters = createAdapterRegistry()

/* ── Backward-compatible named exports (mobile) ── */

export type AnalyticsMobileAdapter = AnalyticsPlatformAdapter
export const registerMobileAnalyticsAdapter = mobileAdapters.register
export const clearMobileAnalyticsAdapters = mobileAdapters.clear
export const createMobileStrategy = mobileAdapters.createStrategy

/* ── Backward-compatible named exports (extension) ── */

export type AnalyticsExtensionAdapter = AnalyticsPlatformAdapter
export const registerExtensionAnalyticsAdapter = extensionAdapters.register
export const clearExtensionAnalyticsAdapters = extensionAdapters.clear
export const createExtensionAnalyticsStrategy = extensionAdapters.createStrategy

/* ── Desktop exports ── */

export type AnalyticsDesktopAdapter = AnalyticsPlatformAdapter
export const registerDesktopAnalyticsAdapter = desktopAdapters.register
export const clearDesktopAnalyticsAdapters = desktopAdapters.clear
export const createDesktopStrategy = desktopAdapters.createStrategy
