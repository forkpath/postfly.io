import type { PropsWithChildren } from 'react'
import type { BillingMobileEntitlement, PaywallCallbacks, PaywallResult } from '@libs/billing'
import type { MonitoringIdentity } from '@libs/monitoring'

import { createContext, useContext, useMemo, useState } from 'react'

import { Alert, Linking } from 'react-native'

import { AnalyticsProvider as AnalyticsProviderName, registerMobileAnalyticsAdapter } from '@libs/analytics'
import { BillingProvider as BillingProviderName, registerMobileBillingAdapter } from '@libs/billing'
import { MonitoringProvider as MonitoringProviderName, registerMobileMonitoringAdapter } from '@libs/monitoring'

interface BillingStateValue {
  entitlements: BillingMobileEntitlement[]
  result: PaywallResult
  identify: (userId: string) => void
  reset: () => void
  purchase: (variantId: string, callbacks?: PaywallCallbacks) => Promise<void>
  linkToPortal: (variantId?: string) => Promise<void>
}

const BillingStateContext = createContext<BillingStateValue | null>(null)

function useBillingState() {
  const value = useContext(BillingStateContext)

  if (!value) {
    throw new Error('Billing state is not available')
  }

  return value
}

function MockBillingProvider({ children }: PropsWithChildren) {
  const [entitlements, setEntitlements] = useState<BillingMobileEntitlement[]>([])
  const [result, setResult] = useState<PaywallResult>('idle')

  const value = useMemo<BillingStateValue>(
    () => ({
      entitlements,
      result,
      identify: () => undefined,
      reset: () => {
        setEntitlements([])
        setResult('idle')
      },
      purchase: async (variantId, callbacks) => {
        callbacks?.onPresent?.()
        setEntitlements([
          {
            id: 'premium',
            active: true,
            variantId
          }
        ])
        setResult('purchased')
        callbacks?.onPurchase?.()
      },
      linkToPortal: async variantId => {
        const suffix = variantId ? `?variant=${variantId}` : ''
        await Linking.openURL(`https://ray.example.com/mobile/billing${suffix}`)
      }
    }),
    [entitlements, result]
  )

  return <BillingStateContext.Provider value={value}>{children}</BillingStateContext.Provider>
}

function registerAnalyticsAdapters() {
  const adapter = {
    Provider: ({ children }: PropsWithChildren) => children,
    track: (event: string, data?: Record<string, string | number | boolean>) => {
      console.log('[mobile-analytics]', event, data)
    },
    identify: (userId: string, traits?: Record<string, string | number | boolean>) => {
      console.log('[mobile-analytics] identify', userId, traits)
    },
    reset: () => {
      console.log('[mobile-analytics] reset')
    }
  }

  registerMobileAnalyticsAdapter(AnalyticsProviderName.POSTHOG, adapter)
  registerMobileAnalyticsAdapter(AnalyticsProviderName.GOOGLE_ANALYTICS, adapter)
}

function registerMonitoringAdapters() {
  const adapter = {
    Provider: ({ children }: PropsWithChildren) => children,
    initialize: () => {
      console.log('[mobile-monitoring] initialize')
    },
    identify: (user: MonitoringIdentity | null) => {
      console.log('[mobile-monitoring] identify', user)
    },
    captureException: (error: unknown) => {
      console.error('[mobile-monitoring] capture', error)
    }
  }

  registerMobileMonitoringAdapter(MonitoringProviderName.POSTHOG, adapter)
  registerMobileMonitoringAdapter(MonitoringProviderName.SENTRY, adapter)
}

function registerBillingAdapters() {
  const createAdapter = () => ({
    Provider: MockBillingProvider,
    useCustomer: () => {
      const state = useBillingState()

      return {
        customer: state.entitlements,
        entitlements: state.entitlements,
        identify: (userId: string) => {
          state.identify(userId)
        },
        reset: () => {
          state.reset()
        },
        linkToPortal: async ({ variantId }: { store: string; variantId?: string }) => {
          await state.linkToPortal(variantId)
        }
      }
    },
    usePaywall: (callbacks?: PaywallCallbacks) => {
      const state = useBillingState()

      return {
        present: async ({ trigger }: { trigger: string }) => {
          await state.purchase(trigger === 'billing' ? 'premium-monthly' : 'premium-yearly', callbacks)
          Alert.alert('升级成功', `已通过 mock ${trigger} 购买 premium 套餐`)
        },
        result: state.result
      }
    }
  })

  registerMobileBillingAdapter(BillingProviderName.REVENUECAT, createAdapter())
  registerMobileBillingAdapter(BillingProviderName.SUPERWALL, createAdapter())
}

let registered = false

export function ensureMobileAdaptersRegistered() {
  if (registered) {
    return
  }

  registerAnalyticsAdapters()
  registerMonitoringAdapters()
  registerBillingAdapters()
  registered = true
}
