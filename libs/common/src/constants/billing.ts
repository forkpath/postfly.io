export const BillingProvider = {
  STRIPE: 'stripe',
  REVENUECAT: 'revenuecat',
  SUPERWALL: 'superwall'
} as const

export type BillingProvider = (typeof BillingProvider)[keyof typeof BillingProvider]

export const BillingSubscriptionStatus = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
  PAUSED: 'paused'
} as const

export type BillingSubscriptionStatus = (typeof BillingSubscriptionStatus)[keyof typeof BillingSubscriptionStatus]

export const BillingOrderStatus = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed'
} as const

export type BillingOrderStatus = (typeof BillingOrderStatus)[keyof typeof BillingOrderStatus]
