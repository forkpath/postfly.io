import { createMutationFactory, createQueryOptionsFactory } from '../lib/queries/factory'

export interface BillingCustomer {
  id: string
  referenceId: string
  externalId: string
  provider: string
  createdAt: string
  updatedAt: string
}

export interface BillingSubscription {
  id: string
  customerId: string
  externalId: string
  variantId: string
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'incomplete_expired' | 'paused'
  store: string
  periodStartsAt: string
  periodEndsAt: string
  trialStartsAt: string | null
  trialEndsAt: string | null
  createdAt: string
  updatedAt: string
}

export interface BillingOrder {
  id: string
  customerId: string
  externalId: string
  variantId: string
  status: 'pending' | 'succeeded' | 'failed'
  store: string
  createdAt: string
  updatedAt: string
}

export interface BillingSummary {
  customers: BillingCustomer[]
  subscriptions: BillingSubscription[]
  orders: BillingOrder[]
}

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
