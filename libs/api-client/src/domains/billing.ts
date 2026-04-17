import type {
  BillingCustomerRecord,
  BillingOrderRecord,
  BillingSubscriptionRecord,
  BillingSummaryCustomer as SharedBillingSummaryCustomer
} from '@libs/billing'

import { createMutationFactory, createQueryOptionsFactory } from '../lib/queries/factory'

export type BillingCustomer = BillingCustomerRecord
export type BillingSubscription = BillingSubscriptionRecord
export type BillingOrder = BillingOrderRecord
export type BillingSummaryCustomer = SharedBillingSummaryCustomer
export type BillingSummary = BillingSummaryCustomer[]

export interface BillingCheckoutInput {
  variantId: string
  successUrl: string
  cancelUrl: string
}

export interface BillingPortalInput {
  returnUrl: string
}

export const billingKeys = {
  all: ['billing'] as const,
  summary: () => [...billingKeys.all, 'summary'] as const
} as const

export const billingQueries = {
  summary: createQueryOptionsFactory<BillingSummary, Error, BillingSummary>(api => ({
    queryKey: billingKeys.summary(),
    queryFn: () => api.get('/billing/me')
  }))
}

export const billingMutations = {
  checkout: createMutationFactory<{ provider: 'stripe'; url: string | null }, Error, BillingCheckoutInput>(
    (api, data) => api.post('/billing/checkout', data)
  ),
  portal: createMutationFactory<{ provider: 'stripe'; url: string }, Error, BillingPortalInput>((api, data) =>
    api.post('/billing/portal', data)
  )
}
