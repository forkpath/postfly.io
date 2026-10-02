import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  getBillingCustomers,
  getBillingSummary,
  upsertBillingCustomer
} from './persistence'

const { customerFindMany, customerUpsert, queryRaw, updateWebhookEvent } = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  customerUpsert: vi.fn(),
  queryRaw: vi.fn(),
  updateWebhookEvent: vi.fn()
}))
vi.mock('@libs/pg-dao', () => ({
  Prisma: { sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ text: strings.join('?'), values }) },
  prisma: {
    $queryRaw: queryRaw,
    customer: { findMany: customerFindMany, upsert: customerUpsert },
    webhookEvent: { update: updateWebhookEvent }
  }
}))
const row = {
  id: 'customer-1',
  userId: 'user-1',
  organizationId: null,
  provider: 'stripe',
  externalId: 'cus_1',
  createdAt: new Date(),
  updatedAt: new Date()
}
describe('billing ownership', () => {
  beforeEach(() => vi.clearAllMocks())
  it('queries by explicit user ownership and derives the public reference', async () => {
    customerFindMany.mockResolvedValue([row])
    await expect(getBillingCustomers({ kind: 'user', userId: 'user-1' }, 'stripe')).resolves.toEqual([
      expect.objectContaining({ referenceId: 'user-1', owner: { kind: 'user', userId: 'user-1' } })
    ])
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', provider: 'stripe' },
      orderBy: { createdAt: 'desc' }
    })
    expect(customerFindMany).toHaveBeenCalledTimes(1)
  })
  it('queries organizations separately, even when a user has the same ID', async () => {
    customerFindMany.mockResolvedValue([{ ...row, userId: null, organizationId: 'user-1' }])
    await expect(getBillingCustomers({ kind: 'organization', organizationId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({ owner: { kind: 'organization', organizationId: 'user-1' } })
    ])
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { organizationId: 'user-1' },
      orderBy: { createdAt: 'desc' }
    })
  })
  it.each([
    { owner: { kind: 'user' as const, userId: 'user-1' }, columns: { userId: 'user-1', organizationId: null } },
    {
      owner: { kind: 'organization' as const, organizationId: 'org-1' },
      columns: { userId: null, organizationId: 'org-1' }
    }
  ])('always writes exactly one owner', async ({ owner, columns }) => {
    customerUpsert.mockResolvedValue({ ...row, ...columns })
    await upsertBillingCustomer({ owner, provider: 'stripe', externalId: 'cus_1' })
    expect(customerUpsert).toHaveBeenCalledWith({
      where: { externalId_provider: { externalId: 'cus_1', provider: 'stripe' } },
      create: { provider: 'stripe', externalId: 'cus_1', ...columns },
      update: columns
    })
  })
  it.each([
    { userId: null, organizationId: null },
    { userId: 'user-1', organizationId: 'org-1' }
  ])('rejects invalid ownership instead of guessing', async columns => {
    customerFindMany.mockResolvedValue([{ ...row, ...columns }])
    await expect(getBillingCustomers({ kind: 'user', userId: 'user-1' })).rejects.toThrow('exactly one owner')
  })
  it('preserves explicit ownership when loading summary relations', async () => {
    customerFindMany.mockResolvedValue([{ ...row, subscriptions: [], orders: [] }])
    await expect(getBillingSummary({ kind: 'user', userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({ owner: { kind: 'user', userId: 'user-1' }, subscriptions: [], orders: [] })
    ])
  })
})

describe('webhook claim state machine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the only atomic claim and encodes failed-only retry semantics', async () => {
    queryRaw.mockResolvedValue([{ id: 'claim-1' }])

    await expect(
      claimWebhookEvent({
        eventId: 'event-1',
        provider: 'stripe',
        type: 'checkout.session.completed'
      })
    ).resolves.toEqual({ id: 'claim-1' })

    const statement = queryRaw.mock.calls[0]?.[0] as { text: string }
    expect(statement.text).toContain('ON CONFLICT ("event_id", "provider") DO UPDATE')
    expect(statement.text).toContain('WHERE "billing"."webhook_event"."status" = \'failed\'')
    expect(statement.text).toContain('"attempt_count" + 1')
  })

  it('returns null when a processed, skipped, or active row rejects the claim', async () => {
    queryRaw.mockResolvedValue([])

    await expect(
      claimWebhookEvent({
        eventId: 'event-1',
        provider: 'stripe',
        type: 'checkout.session.completed'
      })
    ).resolves.toBeNull()
  })

  it('marks completion and failure without creating a second event row', async () => {
    updateWebhookEvent.mockResolvedValue({ id: 'claim-1' })

    await completeWebhookEvent('claim-1', 'processed')
    expect(updateWebhookEvent).toHaveBeenLastCalledWith({
      where: { id: 'claim-1' },
      data: {
        status: 'processed',
        error: null,
        processedAt: expect.any(Date)
      }
    })

    await failWebhookEvent('claim-1', 'temporary provider failure')
    expect(updateWebhookEvent).toHaveBeenLastCalledWith({
      where: { id: 'claim-1' },
      data: {
        status: 'failed',
        error: 'temporary provider failure',
        processedAt: null
      }
    })
  })
})
