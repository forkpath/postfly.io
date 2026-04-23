import { describe, expect, it } from 'vitest'

import { billingPortalReqSchema, checkoutReqSchema } from '../billing.schema'

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
})
