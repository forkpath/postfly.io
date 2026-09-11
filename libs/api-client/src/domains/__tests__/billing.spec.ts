import type { ApiClient } from '../../lib/client'

import { describe, expect, it, vi } from 'vitest'

import { billingKeys, billingMutations, billingQueries } from '../billing'

function apiClient() {
  const get = vi.fn().mockResolvedValue([])
  const post = vi.fn().mockResolvedValue({ provider: 'stripe', url: 'https://billing.test' })
  return {
    api: { get, post } as unknown as ApiClient,
    get,
    post
  }
}

const checkout = {
  variantId: 'price-team',
  successUrl: 'https://app.test/success',
  cancelUrl: 'https://app.test/cancel'
}

describe('billing API ownership boundary', () => {
  it('separates user and organization query caches even when IDs match', () => {
    expect(billingKeys.summary({ kind: 'user', userId: 'same-id' })).toEqual(['billing', 'summary', 'user', 'same-id'])
    expect(
      billingKeys.summary({
        kind: 'organization',
        organizationId: 'same-id'
      })
    ).toEqual(['billing', 'summary', 'organization', 'same-id'])
  })

  it('derives the organization summary URL from the owner supplied by trusted UI state', async () => {
    const { api, get } = apiClient()
    const query = billingQueries.summary(api, {
      kind: 'organization',
      organizationId: 'organization-1'
    })

    await query.queryFn({ queryKey: query.queryKey, signal: AbortSignal.abort() })

    expect(get).toHaveBeenCalledWith('/organizations/organization-1/billing')
  })

  it('parses the summary response and converts transport timestamps', async () => {
    const { api, get } = apiClient()
    get.mockResolvedValue([
      {
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
    ])
    const query = billingQueries.summary(api, {
      kind: 'user',
      userId: 'user-1'
    })

    const result = await query.queryFn({
      queryKey: query.queryKey,
      signal: AbortSignal.abort()
    })

    expect(result[0]?.owner).toEqual({ kind: 'user', userId: 'user-1' })
    expect(result[0]?.createdAt).toBeInstanceOf(Date)
  })

  it('validates checkout input and strips caller-supplied owner fields before POST', async () => {
    const { api, post } = apiClient()
    await billingMutations.organizationCheckout.fn(
      api,
      {
        ...checkout,
        ownerId: 'attacker-user',
        organizationId: 'attacker-organization'
      } as typeof checkout,
      { organizationId: 'organization-1' }
    )

    expect(post).toHaveBeenCalledWith('/organizations/organization-1/billing/checkout', checkout)
  })

  it('rejects invalid redirect URLs before issuing an API request', async () => {
    const { api, post } = apiClient()

    await expect(
      billingMutations.checkout.fn(api, {
        ...checkout,
        successUrl: 'javascript:alert(1)'
      })
    ).rejects.toThrow()
    expect(post).not.toHaveBeenCalled()
  })
})
