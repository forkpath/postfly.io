import { describe, expect, it } from 'vitest'

import { findBillingVariant, formatBillingPrice, hasActiveSubscription } from './utils'

describe('billing utils', () => {
  it('finds billing variants by id', () => {
    const actual = findBillingVariant('premium-monthly')

    expect(actual?.planId).toBe('premium')
    expect(actual?.interval).toBe('month')
  })

  it('formats billing prices using cents', () => {
    const actual = formatBillingPrice(1900)

    expect(actual).toBe('$19.00')
  })

  it('detects active subscriptions', () => {
    const actual = hasActiveSubscription([
      {
        id: 'sub_1',
        customerId: 'cus_1',
        provider: 'stripe',
        externalId: 'sub_ext_1',
        planId: 'premium',
        variantId: 'premium-monthly',
        status: 'active',
        interval: 'month',
        currency: 'USD',
        amount: 1900,
        cancelAtPeriodEnd: false,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        trialEndsAt: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ])

    expect(actual).toBe(true)
  })
})
