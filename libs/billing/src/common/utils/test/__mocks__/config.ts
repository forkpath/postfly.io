import type { BillingConfig } from '../../../config'

import { BillingDiscountType, BillingModel, BillingPlan, RecurringInterval } from '../../../types'

export const config: BillingConfig = {
  plans: [
    {
      id: BillingPlan.FREE,
      name: 'plan.free.name',
      description: 'plan.free.description',
      badge: null,
      features: ['FEATURE_1', 'FEATURE_2'],
      variants: [
        {
          id: 'free-lifetime',
          cost: 0,
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.ONE_TIME
        },
        {
          id: 'free-monthly',
          cost: 0,
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH
        },
        {
          id: 'free-yearly',
          cost: 0,
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR
        }
      ]
    },
    {
      id: BillingPlan.PREMIUM,
      name: 'plan.premium.name',
      description: 'plan.premium.description',
      badge: 'plan.premium.badge',
      features: ['FEATURE_1', 'FEATURE_2', 'FEATURE_3', 'FEATURE_4'],
      variants: [
        {
          id: 'premium-one-time',
          cost: 19900,
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.ONE_TIME
        },
        {
          id: 'premium-monthly',
          cost: 1900,
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH,
          trialDays: 7
        },
        {
          id: 'premium-yearly',
          cost: 19000, // Higher than monthly * 12 to test recurring discount
          custom: false,
          currency: 'usd',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR,
          trialDays: 7
        },
        {
          id: 'premium-monthly-hidden',
          cost: 1900,
          custom: false,
          currency: 'usd',
          hidden: true,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH
        }
      ]
    },
    {
      id: BillingPlan.ENTERPRISE,
      name: 'plan.enterprise.name',
      description: 'plan.enterprise.description',
      badge: null,
      features: ['FEATURE_1', 'FEATURE_2', 'FEATURE_3', 'FEATURE_4', 'FEATURE_5'],
      variants: [
        {
          id: 'enterprise-lifetime',
          custom: true,
          label: 'common:contactUs',
          href: '/contact',
          hidden: false,
          model: BillingModel.ONE_TIME
        },
        {
          id: 'enterprise-monthly',
          custom: true,
          label: 'common:contactUs',
          href: '/contact',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.MONTH
        },
        {
          id: 'enterprise-yearly',
          custom: true,
          label: 'common:contactUs',
          href: '/contact',
          hidden: false,
          model: BillingModel.RECURRING,
          interval: RecurringInterval.YEAR
        }
      ]
    }
  ],
  discounts: [
    {
      code: '50OFF',
      type: BillingDiscountType.PERCENT,
      off: 50,
      appliesTo: ['premium-monthly', 'premium-yearly']
    },
    {
      code: '100OFF',
      type: BillingDiscountType.AMOUNT,
      off: 1000,
      appliesTo: ['premium-monthly']
    },
    {
      code: '10OFF',
      type: BillingDiscountType.PERCENT,
      off: 10,
      appliesTo: ['premium-yearly']
    }
  ]
}

export const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing'] as const
