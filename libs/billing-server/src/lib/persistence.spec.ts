import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  claimWebhookEvent,
  completeWebhookEvent,
  failWebhookEvent,
  getBillingCustomers,
  getBillingSummary,
  upsertBillingCustomer
} from './persistence'

const { customerFindMany, customerUpsert, queryRaw, rolloutEnv, updateWebhookEvent } = vi.hoisted(() => ({
  customerFindMany: vi.fn(),
  customerUpsert: vi.fn(),
  queryRaw: vi.fn(),
  rolloutEnv: {
    BILLING_OWNER_V2_DUAL_WRITE: false,
    BILLING_OWNER_V2_SHADOW_READ: false,
    BILLING_OWNER_V2_READ: false,
    ORGANIZATION_BILLING_ENABLED: false
  },
  updateWebhookEvent: vi.fn()
}))

vi.mock('@libs/pg-dao', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      text: strings.join('?'),
      values
    })
  },
  prisma: {
    $queryRaw: queryRaw,
    customer: {
      findMany: customerFindMany,
      upsert: customerUpsert
    },
    webhookEvent: { update: updateWebhookEvent }
  }
}))

vi.mock('./env', () => ({ serverEnv: rolloutEnv }))

const createdAt = new Date('2026-01-01T00:00:00.000Z')
const updatedAt = new Date('2026-01-02T00:00:00.000Z')

function customerRow(
  overrides: Partial<{
    id: string
    referenceId: string
    userId: string | null
    organizationId: string | null
    provider: string
    externalId: string
  }> = {}
) {
  return {
    id: 'customer-legacy',
    referenceId: 'user-1',
    userId: null,
    organizationId: null,
    provider: 'stripe',
    externalId: 'cus_legacy',
    createdAt,
    updatedAt,
    ...overrides
  }
}

describe('Billing owner rollout matrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    rolloutEnv.BILLING_OWNER_V2_DUAL_WRITE = false
    rolloutEnv.BILLING_OWNER_V2_SHADOW_READ = false
    rolloutEnv.BILLING_OWNER_V2_READ = false
    rolloutEnv.ORGANIZATION_BILLING_ENABLED = false
  })

  it('uses legacy reads and writes when every V2 flag is off', async () => {
    customerFindMany.mockResolvedValue([customerRow()])
    customerUpsert.mockResolvedValue(customerRow())

    await expect(getBillingCustomers({ kind: 'user', userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({
        referenceId: 'user-1',
        owner: { kind: 'user', userId: 'user-1' }
      })
    ])
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { referenceId: 'user-1' },
      orderBy: { createdAt: 'desc' }
    })

    await upsertBillingCustomer({
      owner: { kind: 'user', userId: 'user-1' },
      provider: 'stripe',
      externalId: 'cus_legacy'
    })
    const upsert = customerUpsert.mock.calls[0]?.[0]
    expect(upsert.create).toEqual({
      referenceId: 'user-1',
      provider: 'stripe',
      externalId: 'cus_legacy'
    })
    expect(upsert.update).toEqual({ referenceId: 'user-1' })
  })

  it('dual-writes an explicit user owner while retaining referenceId', async () => {
    rolloutEnv.BILLING_OWNER_V2_DUAL_WRITE = true
    customerUpsert.mockResolvedValue(customerRow({ userId: 'user-1', id: 'customer-v2' }))

    await upsertBillingCustomer({
      owner: { kind: 'user', userId: 'user-1' },
      provider: 'stripe',
      externalId: 'cus_v2'
    })

    expect(customerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          referenceId: 'user-1',
          userId: 'user-1',
          organizationId: null
        }),
        update: {
          referenceId: 'user-1',
          userId: 'user-1',
          organizationId: null
        }
      })
    )
  })

  it('always writes an explicit organization owner', async () => {
    customerUpsert.mockResolvedValue(
      customerRow({
        id: 'customer-organization',
        referenceId: 'organization-1',
        organizationId: 'organization-1'
      })
    )

    await upsertBillingCustomer({
      owner: { kind: 'organization', organizationId: 'organization-1' },
      provider: 'stripe',
      externalId: 'cus_organization'
    })

    expect(customerUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          referenceId: 'organization-1',
          userId: null,
          organizationId: 'organization-1'
        })
      })
    )
  })

  it('shadow-compares both paths but returns legacy rows before V2 read', async () => {
    rolloutEnv.BILLING_OWNER_V2_DUAL_WRITE = true
    rolloutEnv.BILLING_OWNER_V2_SHADOW_READ = true
    const legacy = customerRow()
    const v2 = customerRow({ id: 'customer-v2', userId: 'user-1' })
    customerFindMany.mockImplementation(({ where }) =>
      'referenceId' in where ? Promise.resolve([legacy]) : Promise.resolve([v2])
    )
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await expect(getBillingCustomers({ kind: 'user', userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({
        id: 'customer-legacy',
        owner: { kind: 'user', userId: 'user-1' }
      })
    ])
    expect(customerFindMany).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledWith(
      'billing owner shadow-read mismatch',
      expect.objectContaining({
        legacyCustomerIds: 'customer-legacy',
        ownerCustomerIds: 'customer-v2'
      })
    )
    consoleError.mockRestore()
  })

  it('returns explicit-owner rows after V2 read is enabled', async () => {
    rolloutEnv.BILLING_OWNER_V2_DUAL_WRITE = true
    rolloutEnv.BILLING_OWNER_V2_SHADOW_READ = true
    rolloutEnv.BILLING_OWNER_V2_READ = true
    const row = customerRow({ id: 'customer-v2', userId: 'user-1' })
    customerFindMany.mockResolvedValue([row])

    await expect(getBillingCustomers({ kind: 'user', userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({
        id: 'customer-v2',
        owner: { kind: 'user', userId: 'user-1' }
      })
    ])
    expect(customerFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' }
    })
  })

  it('preserves the server-derived owner after loading summary relations', async () => {
    customerFindMany.mockResolvedValue([
      {
        ...customerRow(),
        subscriptions: [],
        orders: []
      }
    ])

    await expect(getBillingSummary({ kind: 'user', userId: 'user-1' })).resolves.toEqual([
      expect.objectContaining({
        referenceId: 'user-1',
        owner: { kind: 'user', userId: 'user-1' }
      })
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
