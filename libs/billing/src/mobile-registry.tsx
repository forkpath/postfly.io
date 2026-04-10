import type { ReactNode } from 'react'
import type { BillingMobileEntitlement, PaywallCallbacks } from './lib/types'

import { mobileEnv } from './env'
import { BillingProvider, PaywallResult } from './lib/types'

export interface BillingMobileCustomerState {
  customer: unknown
  entitlements: BillingMobileEntitlement[]
  identify: (userId: string, traits?: Record<string, unknown>) => void
  reset: () => void
  linkToPortal: (input: { store: string; variantId?: string }) => Promise<void>
}

export interface BillingMobilePaywallState {
  present: (input: { trigger: string }) => Promise<void>
  result: PaywallResult
}

export interface BillingMobileAdapter {
  Provider?: ({ children }: { children: ReactNode }) => ReactNode
  useCustomer: () => BillingMobileCustomerState
  usePaywall: (callbacks?: PaywallCallbacks) => BillingMobilePaywallState
}

const adapters: Partial<Record<BillingProvider, BillingMobileAdapter>> = {}

function createFallbackCustomerState(): BillingMobileCustomerState {
  return {
    customer: null,
    entitlements: [],
    identify: () => undefined,
    reset: () => undefined,
    linkToPortal: async () => undefined
  }
}

function createFallbackPaywallState(): BillingMobilePaywallState {
  return {
    present: async () => undefined,
    result: PaywallResult.IDLE
  }
}

export function registerMobileBillingAdapter(provider: BillingProvider, adapter: BillingMobileAdapter) {
  adapters[provider] = adapter
}

export function clearMobileBillingAdapters() {
  adapters[BillingProvider.REVENUECAT] = undefined
  adapters[BillingProvider.SUPERWALL] = undefined
}

export function getCurrentMobileBillingProvider(): BillingProvider {
  return mobileEnv.EXPO_PUBLIC_BILLING_MOBILE_PROVIDER
}

export function useMobileBillingCustomer() {
  const provider = getCurrentMobileBillingProvider()
  const adapter = adapters[provider]

  if (!adapter) {
    return createFallbackCustomerState()
  }

  return adapter.useCustomer()
}

export function useMobilePaywall(callbacks?: PaywallCallbacks) {
  const provider = getCurrentMobileBillingProvider()
  const adapter = adapters[provider]

  if (!adapter) {
    return createFallbackPaywallState()
  }

  return adapter.usePaywall(callbacks)
}

export function MobileBillingProvider({ children }: { children: ReactNode }) {
  const provider = getCurrentMobileBillingProvider()
  const adapter = adapters[provider]

  if (!adapter?.Provider) {
    return children
  }

  return <adapter.Provider>{children}</adapter.Provider>
}
