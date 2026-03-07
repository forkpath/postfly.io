import { createMutationFactory, createQueryOptionsFactory } from '../lib/queries/factory'

export interface BillingCustomer {
  id: string
  referenceId: string
  referenceType: 'user' | 'organization'
  provider: 'stripe' | 'revenuecat' | 'superwall'
  externalId: string
  email: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BillingSubscription {
  id: string
  customerId: string
  provider: 'stripe' | 'revenuecat' | 'superwall'
  externalId: string
  planId: string
  variantId: string
  status: 'trialing' | 'active' | 'past_due' | 'unpaid' | 'canceled' | 'incomplete' | 'paused'
  interval: 'day' | 'week' | 'month' | 'year' | null
  currency: string | null
  amount: number | null
  cancelAtPeriodEnd: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface BillingOrder {
  id: string
  customerId: string
  provider: 'stripe' | 'revenuecat' | 'superwall'
  externalId: string
  planId: string
  variantId: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'canceled'
  currency: string | null
  amount: number | null
  metadata: Record<string, unknown> | null
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
