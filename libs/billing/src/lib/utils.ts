import type {
  BillingInterval,
  BillingOrderRecord,
  BillingPlanConfig,
  BillingSubscriptionRecord,
  BillingVariant
} from './types'

import { billingConfig } from './config'
import { BillingModel, BillingPlan, BillingSubscriptionStatus } from './types'

const ACTIVE_SUBSCRIPTION_STATUSES: BillingSubscriptionRecord['status'][] = [
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.TRIALING
]

export function getBillingPlans(includeHidden = false): BillingPlanConfig[] {
  if (includeHidden) {
    return [...billingConfig.plans]
  }

  return billingConfig.plans.map(plan => ({
    ...plan,
    variants: plan.variants.filter(variant => !variant.hidden)
  }))
}

export function findBillingPlan(planId: BillingPlan): BillingPlanConfig | undefined {
  return billingConfig.plans.find(plan => plan.id === planId)
}

export function findBillingVariant(variantId: string): (BillingVariant & { planId: BillingPlan }) | undefined {
  for (const plan of billingConfig.plans) {
    const variant = plan.variants.find(item => item.id === variantId)

    if (variant) {
      return {
        ...variant,
        planId: plan.id
      }
    }
  }

  return undefined
}

export function findBillingVariantByStripePriceId(
  stripePriceId: string
): (BillingVariant & { planId: BillingPlan }) | undefined {
  for (const plan of billingConfig.plans) {
    const variant = plan.variants.find(item => item.stripePriceId === stripePriceId)

    if (variant) {
      return {
        ...variant,
        planId: plan.id
      }
    }
  }

  return undefined
}

export function formatBillingPrice(cost: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(cost / 100)
}

export function formatBillingInterval(interval?: BillingInterval): string {
  if (!interval) {
    return ''
  }

  return interval
}

export function hasActiveSubscription(subscriptions: BillingSubscriptionRecord[]): boolean {
  return subscriptions.some(subscription => ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status))
}

export function getLatestSuccessfulOrder(orders: BillingOrderRecord[]): BillingOrderRecord | null {
  const order = [...orders]
    .filter(item => item.status === 'succeeded')
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0]

  return order ?? null
}

export function isRecurringVariant(variant: BillingVariant): boolean {
  return variant.model === BillingModel.RECURRING
}

export function getActivePlan(summary?: {
  subscriptions?: { status: BillingSubscriptionRecord['status']; variantId: string }[]
  orders?: { status: string; variantId: string; updatedAt: string | Date }[]
}): BillingPlan {
  if (!summary) {
    return BillingPlan.FREE
  }

  const activeSubscription = summary.subscriptions?.find(sub => ACTIVE_SUBSCRIPTION_STATUSES.includes(sub.status))

  if (activeSubscription) {
    const variant = findBillingVariant(activeSubscription.variantId)
    if (variant) {
      return variant.planId
    }
  }

  const successfulOrder = summary.orders
    ?.filter(order => order.status === 'succeeded')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0]

  if (successfulOrder) {
    const variant = findBillingVariant(successfulOrder.variantId)
    if (variant) {
      return variant.planId
    }
  }

  return BillingPlan.FREE
}
