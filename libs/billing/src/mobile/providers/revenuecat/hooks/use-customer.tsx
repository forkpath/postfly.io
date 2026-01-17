import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import * as Linking from 'expo-linking'
import { Platform } from 'react-native'
import Purchases from 'react-native-purchases'

import { MOBILE_STORE_LINKS, MobileStore } from '@libs/billing/common'

import { BillingProvider } from '../../types'

export const useCustomer = () => {
  const customer = useQuery({
    queryKey: [BillingProvider.REVENUECAT, 'customer'],
    queryFn: () => Purchases.getCustomerInfo(),
    gcTime: 0,
    staleTime: 0
  })

  const entitlements = useMemo(() => {
    return Object.values(customer.data?.entitlements.all ?? {}).map(entitlement => ({
      id: entitlement.identifier.toLowerCase(),
      active: entitlement.isActive,
      variantId: entitlement.productIdentifier
    }))
  }, [customer.data])

  const identify = (userId: string) => {
    void Purchases.logIn(userId)
  }

  const reset = () => {
    void (async () => {
      const isAnonymous = await Purchases.isAnonymous()
      if (isAnonymous) {
        return
      }

      await Purchases.logOut()
    })()
  }

  const linkToPortal = async ({ store, variantId }: { store: string; variantId?: string }) => {
    if (!Object.values(MobileStore).includes(store)) {
      throw new Error(`Invalid store: ${store}`)
    }

    if (store === MobileStore.APP_STORE && Platform.OS === 'ios') {
      return Purchases.showManageSubscriptions()
    }

    const url = new URL(MOBILE_STORE_LINKS[store as keyof typeof MOBILE_STORE_LINKS])

    if (store === MobileStore.PLAY_STORE && variantId) {
      url.searchParams.set('sku', variantId)
    }

    await Linking.openURL(MOBILE_STORE_LINKS[store as keyof typeof MOBILE_STORE_LINKS])
  }

  return {
    identify,
    reset,
    customer: customer.data,
    entitlements,
    linkToPortal
  } as const
}
