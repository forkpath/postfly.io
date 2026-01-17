import type { BillingConfig } from './schema'

import {
  BillingDiscountType,
  BillingModel,
  BillingPlan,
  MobileStore,
  RecurringInterval,
  SubscriptionStatus
} from '../types'
import { FEATURES } from './features'
import { billingConfigSchema } from './schema'

export const config = billingConfigSchema.parse({
  plans: [
    {
      id: BillingPlan.FREE,
      name: 'plan.free.name',
      description: 'plan.free.description',
      badge: null,
      features: Object.values(FEATURES[BillingPlan.FREE]),
      variants: [
        {
          id: 'free-lifetime',
          cost: 0,
          model: BillingModel.ONE_TIME
        },
        {
          id: 'free-monthly',
          cost: 0,
          interval: RecurringInterval.MONTH,
          model: BillingModel.RECURRING
        },
        {
          id: 'free-yearly',
          cost: 0,
          interval: RecurringInterval.YEAR,
          model: BillingModel.RECURRING
        }
      ]
    },
    {
      id: BillingPlan.PREMIUM,
      name: 'plan.premium.name',
      description: 'plan.premium.description',
      badge: 'plan.premium.badge',
      features: Object.values(FEATURES[BillingPlan.PREMIUM]),
      variants: [
        /* WEB */
        {
          id: 'price_1SnNokF6GIkBZmgVxQiOXZwS',
          cost: 19900,
          model: BillingModel.ONE_TIME
        },
        {
          id: 'price_1SnNneF6GIkBZmgVdX4GP7O8',
          cost: 1900,
          interval: RecurringInterval.MONTH,
          trialDays: 7,
          model: BillingModel.RECURRING
        },
        {
          id: 'price_1SnNoVF6GIkBZmgViiuMqIv0',
          cost: 8900,
          interval: RecurringInterval.YEAR,
          trialDays: 7,
          model: BillingModel.RECURRING
        },

        /* MOBILE */
        {
          id: 'core_premium_one_time_flat',
          cost: 19900,
          model: BillingModel.ONE_TIME,
          hidden: true
        },
        {
          id: 'core_premium_recurring_month_flat',
          cost: 1900,
          interval: RecurringInterval.MONTH,
          trialDays: 7,
          model: BillingModel.RECURRING,
          hidden: true
        },
        {
          id: 'core_premium_recurring_year_flat',
          cost: 8900,
          interval: RecurringInterval.YEAR,
          trialDays: 7,
          model: BillingModel.RECURRING,
          hidden: true
        }
      ]
    },
    {
      id: BillingPlan.ENTERPRISE,
      name: 'plan.enterprise.name',
      description: 'plan.enterprise.description',
      badge: null,
      features: Object.values(FEATURES[BillingPlan.ENTERPRISE]),
      variants: [
        {
          id: 'enterprise-lifetime',
          label: 'common:contactUs',
          href: '/contact',
          model: BillingModel.ONE_TIME,
          custom: true
        },
        {
          id: 'enterprise-monthly',
          label: 'common:contactUs',
          href: '/contact',
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH,
          custom: true
        },
        {
          id: 'enterprise-yearly',
          label: 'common:contactUs',
          href: '/contact',
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR,
          custom: true
        }
      ]
    }
  ],
  discounts: [
    {
      code: '50OFF',
      type: BillingDiscountType.PERCENT,
      off: 50,
      appliesTo: ['price_1SnNokF6GIkBZmgVxQiOXZwS', 'price_1SnNneF6GIkBZmgVdX4GP7O8', 'price_1SnNoVF6GIkBZmgViiuMqIv0']
    }
  ]
}) satisfies BillingConfig

export * from './features'
export * from './schema'

export const ACTIVE_SUBSCRIPTION_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING]

export const MOBILE_STORE_LINKS = {
  [MobileStore.APP_STORE]: 'https://apps.apple.com/account/subscriptions',
  [MobileStore.PLAY_STORE]: 'https://play.google.com/store/account/subscriptions'
} as const satisfies Record<MobileStore, string>
