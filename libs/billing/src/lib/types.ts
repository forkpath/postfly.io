export const BillingPlan = {
  FREE: 'free',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
} as const

export type BillingPlan = (typeof BillingPlan)[keyof typeof BillingPlan]

export const BillingModel = {
  ONE_TIME: 'one-time',
  RECURRING: 'recurring'
} as const

export type BillingModel = (typeof BillingModel)[keyof typeof BillingModel]

export const BillingInterval = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year'
} as const

export type BillingInterval = (typeof BillingInterval)[keyof typeof BillingInterval]

export const BillingProvider = {
  STRIPE: 'stripe',
  REVENUECAT: 'revenuecat',
  SUPERWALL: 'superwall'
} as const

export type BillingProvider = (typeof BillingProvider)[keyof typeof BillingProvider]

export const BillingReferenceType = {
  USER: 'user',
  ORGANIZATION: 'organization'
} as const

export type BillingReferenceType = (typeof BillingReferenceType)[keyof typeof BillingReferenceType]

export const BillingSubscriptionStatus = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  PAUSED: 'paused'
} as const

export type BillingSubscriptionStatus = (typeof BillingSubscriptionStatus)[keyof typeof BillingSubscriptionStatus]

export const BillingOrderStatus = {
  PENDING: 'pending',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELED: 'canceled'
} as const

export type BillingOrderStatus = (typeof BillingOrderStatus)[keyof typeof BillingOrderStatus]

export interface BillingVariant {
  id: string
  label?: string
  href?: string
  cost: number
  model: BillingModel
  interval?: BillingInterval
  trialDays?: number
  hidden?: boolean
  custom?: boolean
  stripePriceId?: string
  revenueCatProductIds?: {
    ios?: string
    android?: string
  }
  superwallPlacement?: string
}

export interface BillingPlanConfig {
  id: BillingPlan
  name: string
  description: string
  badge: string | null
  features: string[]
  variants: BillingVariant[]
}

export interface BillingDiscount {
  code: string
  value: number
  type: 'percent' | 'amount'
  appliesTo: string[]
}

export interface BillingConfig {
  plans: BillingPlanConfig[]
  discounts: BillingDiscount[]
}

export interface BillingCustomerRecord {
  id: string
  referenceId: string
  referenceType: BillingReferenceType
  provider: BillingProvider
  externalId: string
  email: string | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface BillingSubscriptionRecord {
  id: string
  customerId: string
  provider: BillingProvider
  externalId: string
  planId: string
  variantId: string
  status: BillingSubscriptionStatus
  interval: BillingInterval | null
  currency: string | null
  amount: number | null
  cancelAtPeriodEnd: boolean
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface BillingOrderRecord {
  id: string
  customerId: string
  provider: BillingProvider
  externalId: string
  planId: string
  variantId: string
  status: BillingOrderStatus
  currency: string | null
  amount: number | null
  metadata: Record<string, unknown> | null
  createdAt: Date
  updatedAt: Date
}

export interface BillingSummary {
  customers: BillingCustomerRecord[]
  subscriptions: BillingSubscriptionRecord[]
  orders: BillingOrderRecord[]
}

export interface BillingCheckoutInput {
  referenceId: string
  referenceType?: BillingReferenceType
  email: string
  variantId: string
  successUrl: string
  cancelUrl: string
}

export interface BillingPortalInput {
  referenceId: string
  referenceType?: BillingReferenceType
  email: string
  returnUrl: string
}

export interface BillingMobileEntitlement {
  id: string
  active: boolean
  variantId?: string
}

export const PaywallResult = {
  IDLE: 'idle',
  PURCHASED: 'purchased',
  RESTORED: 'restored',
  DISMISSED: 'dismissed',
  SKIPPED: 'skipped',
  ERROR: 'error'
} as const

export type PaywallResult = (typeof PaywallResult)[keyof typeof PaywallResult]

export interface PaywallCallbacks {
  onPresent?: () => void
  onDismiss?: () => void
  onPurchase?: () => void
  onRestore?: () => void
  onSkip?: () => void
  onError?: (error: unknown) => void
}
