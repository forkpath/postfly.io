import { describe, expect, it } from 'vitest'

import {
  billingPortalRedirectResSchema,
  billingPortalReqSchema,
  billingRedirectResSchema,
  billingSummaryResSchema,
  checkoutReqSchema
} from '../billing.schema'

describe('checkoutReqSchema', () => {
  it('parses a valid checkout payload', () => {
    const parsed = checkoutReqSchema.parse({
      variantId: 'premium-monthly',
      successUrl: 'https://example.com/success',
      cancelUrl: 'https://example.com/cancel'
    })

    expect(parsed.variantId).toBe('premium-monthly')
  })

  it('rejects invalid urls', () => {
    const result = checkoutReqSchema.safeParse({
      variantId: 'premium-monthly',
      successUrl: '/success',
      cancelUrl: '/cancel'
    })

    expect(result.success).toBe(false)
  })

  it('rejects non-HTTP redirect protocols', () => {
    const result = checkoutReqSchema.safeParse({
      variantId: 'premium-monthly',
      successUrl: 'javascript:alert(1)',
      cancelUrl: 'https://example.com/cancel'
    })

    expect(result.success).toBe(false)
  })
})

describe('billingPortalReqSchema', () => {
  it('parses a valid portal payload', () => {
    const parsed = billingPortalReqSchema.parse({
      returnUrl: 'https://example.com/account'
    })

    expect(parsed.returnUrl).toBe('https://example.com/account')
  })

  it('requires a valid returnUrl', () => {
    const result = billingPortalReqSchema.safeParse({
      returnUrl: 'not-a-url'
    })

    expect(result.success).toBe(false)
  })

  it('rejects non-HTTP return protocols', () => {
    const result = billingPortalReqSchema.safeParse({
      returnUrl: 'data:text/html,invalid'
    })

    expect(result.success).toBe(false)
  })
})

describe('billing response schemas', () => {
  const customer = {
    id: 'customer-1',
    referenceId: 'user-1',
    userId: null,
    organizationId: null,
    externalId: 'cus_1',
    provider: 'stripe',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    owner: { kind: 'user', userId: 'user-1' },
    subscriptions: [],
    orders: []
  }

  it('requires an explicit owner and converts JSON timestamps to dates', () => {
    const parsed = billingSummaryResSchema.parse([customer])

    expect(parsed[0]?.owner).toEqual({ kind: 'user', userId: 'user-1' })
    expect(parsed[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('rejects a legacy summary response without owner', () => {
    const legacyCustomer = { ...customer, owner: undefined }

    expect(billingSummaryResSchema.safeParse([legacyCustomer]).success).toBe(false)
  })

  it('accepts only Stripe redirects over HTTP(S)', () => {
    expect(
      billingRedirectResSchema.safeParse({
        provider: 'stripe',
        url: 'https://billing.test/session'
      }).success
    ).toBe(true)
    expect(
      billingRedirectResSchema.safeParse({
        provider: 'stripe',
        url: 'javascript:alert(1)'
      }).success
    ).toBe(false)
  })

  it('requires a concrete portal URL', () => {
    expect(
      billingPortalRedirectResSchema.safeParse({
        provider: 'stripe',
        url: null
      }).success
    ).toBe(false)
  })
})
