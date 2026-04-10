import type { ReactNode } from 'react'
import type {
  MonitoringIdentity,
  MonitoringProviderName,
  MonitoringProviderStrategy,
  MonitoringServerStrategy
} from './types'

/* ── Client adapter (mobile / desktop / extension / web) ── */

export interface MonitoringPlatformAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => void
  identify: (info: MonitoringIdentity | null) => void
  initialize: () => void | Promise<void>
}

const clientNoop: MonitoringProviderStrategy = {
  Provider: ({ children }) => children,
  captureException: () => undefined,
  identify: () => undefined,
  initialize: () => undefined
}

export function createAdapterRegistry() {
  const adapters: Partial<Record<MonitoringProviderName, MonitoringPlatformAdapter>> = {}

  function register(provider: MonitoringProviderName, adapter: MonitoringPlatformAdapter) {
    adapters[provider] = adapter
  }

  function clear() {
    for (const key of Object.keys(adapters)) {
      delete adapters[key as MonitoringProviderName]
    }
  }

  function createStrategy(provider: MonitoringProviderName): MonitoringProviderStrategy {
    const adapter = adapters[provider]

    if (!adapter) {
      return clientNoop
    }

    return {
      Provider: ({ children }) => (adapter.Provider ? <adapter.Provider>{children}</adapter.Provider> : children),
      captureException: adapter.captureException,
      identify: adapter.identify,
      initialize: adapter.initialize
    }
  }

  return { register, clear, createStrategy }
}

/* ── Server adapter ── */

export interface MonitoringServerPlatformAdapter {
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => void
  initialize: () => void | Promise<void>
}

const serverNoop: MonitoringServerStrategy = {
  captureException: () => undefined,
  initialize: () => undefined
}

export function createServerAdapterRegistry() {
  const adapters: Partial<Record<MonitoringProviderName, MonitoringServerPlatformAdapter>> = {}

  function register(provider: MonitoringProviderName, adapter: MonitoringServerPlatformAdapter) {
    adapters[provider] = adapter
  }

  function clear() {
    for (const key of Object.keys(adapters)) {
      delete adapters[key as MonitoringProviderName]
    }
  }

  function createStrategy(provider: MonitoringProviderName): MonitoringServerStrategy {
    const adapter = adapters[provider]

    if (!adapter) {
      return serverNoop
    }

    return {
      captureException: adapter.captureException,
      initialize: adapter.initialize
    }
  }

  return { register, clear, createStrategy }
}

/* ── Platform-specific registries (client) ── */

export const webAdapters = createAdapterRegistry()
export const mobileAdapters = createAdapterRegistry()
export const desktopAdapters = createAdapterRegistry()
export const extensionAdapters = createAdapterRegistry()

/* ── Platform-specific registries (server) ── */

export const serverAdapters = createServerAdapterRegistry()

/* ── Web exports ── */

export type MonitoringWebAdapter = MonitoringPlatformAdapter
export const registerWebMonitoringAdapter = webAdapters.register
export const clearWebMonitoringAdapters = webAdapters.clear
export const createWebMonitoringStrategy = webAdapters.createStrategy

/* ── Server exports ── */

export type MonitoringServerAdapter = MonitoringServerPlatformAdapter
export const registerServerMonitoringAdapter = serverAdapters.register
export const clearServerMonitoringAdapters = serverAdapters.clear
export const createServerMonitoringStrategy = serverAdapters.createStrategy

/* ── Backward-compatible named exports (mobile) ── */

export type MonitoringMobileAdapter = MonitoringPlatformAdapter
export const registerMobileMonitoringAdapter = mobileAdapters.register
export const clearMobileMonitoringAdapters = mobileAdapters.clear
export const createMobileMonitoringStrategy = mobileAdapters.createStrategy

/* ── Backward-compatible named exports (extension) ── */

export type MonitoringExtensionAdapter = MonitoringPlatformAdapter
export const registerExtensionMonitoringAdapter = extensionAdapters.register
export const clearExtensionMonitoringAdapters = extensionAdapters.clear
export const createExtensionMonitoringStrategy = extensionAdapters.createStrategy

/* ── Desktop exports ── */

export type MonitoringDesktopAdapter = MonitoringPlatformAdapter
export const registerDesktopMonitoringAdapter = desktopAdapters.register
export const clearDesktopMonitoringAdapters = desktopAdapters.clear
export const createDesktopMonitoringStrategy = desktopAdapters.createStrategy
