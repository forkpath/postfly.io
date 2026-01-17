import type { BillingModel, RecurringInterval, SubscriptionStatus } from '../types'

import { ACTIVE_SUBSCRIPTION_STATUSES, config } from '../config'
import { BillingPlan, PaymentStatus } from '../types'

export const findPlanByVariantId = (variantId: string) => {
  const plan = config.plans.find(plan => plan.variants.some(variant => variant.id === variantId))

  const variant = plan?.variants.find(variant => variant.id === variantId)

  return {
    plan,
    variant
  }
}

export const findPlanById = (id: string) => {
  return config.plans.find(plan => plan.id === id)
}

export const findPlanIndexById = (id: string) => {
  return config.plans.findIndex(plan => plan.id === id)
}

export const getPlanFeatures = (id: string) => {
  const index = config.plans.findIndex(plan => plan.id === id)
  if (index === -1) {
    return []
  }
  return Array.from(new Set(config.plans.slice(0, index + 1).flatMap(p => p.features)))
}

export const getActivePlan = <
  Entitlement extends { id: string; active: boolean; variantId?: string },
  Subscription extends { status: SubscriptionStatus; variantId: string },
  Order extends { status: PaymentStatus; variantId: string },
  Summary extends {
    entitlements?: Entitlement[]
    subscriptions?: Subscription[]
    orders?: Order[]
  }
>(
  summary?: Summary | Summary[]
) => {
  const data = Array.isArray(summary) ? summary : [summary]

  const activeEntitlements = data
    .flatMap(customer => customer?.entitlements)
    .filter(entitlement => entitlement?.active)
    .map(entitlement => ({
      id: entitlement?.id,
      variantId: entitlement?.variantId
    }))
    .filter(Boolean)

  const activeSubscriptions = data
    .flatMap(customer => customer?.subscriptions)
    .filter(subscription => subscription?.status && ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status))
    .map(subscription => subscription?.variantId)
    .filter(Boolean)

  const succededOrders = data
    .flatMap(customer => customer?.orders)
    .filter(order => order?.status === PaymentStatus.SUCCEEDED)
    .map(order => order?.variantId)
    .filter(Boolean)

  const availablePlans = [
    ...activeEntitlements.map(entitlement =>
      entitlement.variantId
        ? findPlanByVariantId(entitlement.variantId).plan
        : entitlement.id
          ? findPlanById(entitlement.id)
          : null
    ),
    ...activeSubscriptions.map(id => findPlanByVariantId(id).plan),
    ...succededOrders.map(id => findPlanByVariantId(id).plan)
  ].filter(Boolean)

  return availablePlans.sort((a, b) => findPlanIndexById(a.id) - findPlanIndexById(b.id)).at(-1)?.id ?? BillingPlan.FREE
}

export const getHigherPlans = (planId: BillingPlan) => {
  const idx = findPlanIndexById(planId)

  if (idx === -1) {
    return []
  }

  return config.plans.slice(idx + 1)
}

export const getLowerPlans = (planId: BillingPlan) => {
  const idx = findPlanIndexById(planId)

  if (idx === -1) {
    return []
  }

  return config.plans.slice(0, idx)
}

export const getFilteredPlans = (filters?: { model?: BillingModel; interval?: RecurringInterval; hidden?: boolean }) =>
  config.plans
    .map(plan => {
      if (!filters) {
        return plan
      }
      let variants = plan.variants

      if (typeof filters.model !== 'undefined') {
        variants = variants.filter(variant => variant.model === filters.model)
      }
      if (typeof filters.interval !== 'undefined') {
        variants = variants.filter(variant => 'interval' in variant && variant.interval === filters.interval)
      }
      if (typeof filters.hidden !== 'undefined') {
        variants = variants.filter(variant => Boolean(variant.hidden) === filters.hidden)
      }

      return { ...plan, variants }
    })
    .filter(plan => !!plan.variants.length)
