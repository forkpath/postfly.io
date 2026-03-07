import type {
  BillingInterval,
  BillingOrderRecord,
  BillingPlan,
  BillingPlanConfig,
  BillingSubscriptionRecord,
  BillingVariant
} from './types'

import { billingConfig } from './config'
import { BillingModel, BillingSubscriptionStatus } from './types'

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
