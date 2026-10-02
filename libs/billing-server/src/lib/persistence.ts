import type {
  BillingCustomerRecord,
  BillingOrderRecord,
  BillingOrderStatus,
  BillingOwner,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus
} from '@libs/billing-contract'

import { getBillingOwnerId } from '@libs/billing-contract'
import { Prisma, prisma } from '@libs/pg-dao'

interface CustomerRow {
  id: string
  userId: string | null
  organizationId: string | null
  provider: string
  externalId: string
  createdAt: Date
  updatedAt: Date
}

function ownerData(owner: BillingOwner) {
  return owner.kind === 'user'
    ? { userId: owner.userId, organizationId: null }
    : { userId: null, organizationId: owner.organizationId }
}

function ownerWhere(owner: BillingOwner) {
  return owner.kind === 'user' ? { userId: owner.userId } : { organizationId: owner.organizationId }
}

function mapCustomer(input: CustomerRow): BillingCustomerRecord & { owner: BillingOwner } {
  let owner: BillingOwner
  if (input.userId !== null && input.organizationId === null) {
    owner = { kind: 'user', userId: input.userId }
  } else if (input.organizationId !== null && input.userId === null) {
    owner = { kind: 'organization', organizationId: input.organizationId }
  } else {
    throw new Error('Billing customer must have exactly one owner')
  }

  return {
    id: input.id,
    referenceId: getBillingOwnerId(owner),
    userId: input.userId,
    organizationId: input.organizationId,
    provider: input.provider,
    externalId: input.externalId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
    owner
  }
}

function mapSubscription(input: {
  id: string
  customerId: string
  externalId: string
  variantId: string
  status: string
  store: string
  periodStartsAt: Date
  periodEndsAt: Date
  trialStartsAt: Date | null
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
}): BillingSubscriptionRecord {
  return {
    ...input,
    status: input.status as BillingSubscriptionStatus
  }
}

function mapOrder(input: {
  id: string
  customerId: string
  externalId: string
  variantId: string
  status: string
  store: string
  createdAt: Date
  updatedAt: Date
}): BillingOrderRecord {
  return {
    ...input,
    status: input.status as BillingOrderStatus
  }
}

export async function getBillingCustomers(owner: BillingOwner, provider?: string) {
  const customers = await prisma.customer.findMany({
    where: { ...ownerWhere(owner), ...(provider ? { provider } : {}) },
    orderBy: { createdAt: 'desc' }
  })
  return customers.map(mapCustomer)
}

export async function getBillingCustomersByReferenceId(referenceId: string, provider?: string) {
  return getBillingCustomers({ kind: 'user', userId: referenceId }, provider)
}

export async function getBillingCustomerByExternalId(externalId: string, provider: string) {
  const customer = await prisma.customer.findUnique({
    where: { externalId_provider: { externalId, provider } }
  })
  return customer ? mapCustomer(customer) : null
}

export async function upsertBillingCustomer(input: { owner: BillingOwner; provider: string; externalId: string }) {
  const explicitOwner = ownerData(input.owner)
  const customer = await prisma.customer.upsert({
    where: {
      externalId_provider: {
        externalId: input.externalId,
        provider: input.provider
      }
    },
    create: {
      provider: input.provider,
      externalId: input.externalId,
      ...explicitOwner
    },
    update: {
      ...explicitOwner
    }
  })
  return mapCustomer(customer)
}

export async function upsertBillingSubscription(input: {
  customerId: string
  externalId: string
  variantId: string
  status: BillingSubscriptionStatus
  store: string
  periodStartsAt: Date
  periodEndsAt: Date
  trialStartsAt?: Date | null
  trialEndsAt?: Date | null
}) {
  const subscription = await prisma.subscription.upsert({
    where: { externalId_store: { externalId: input.externalId, store: input.store } },
    create: {
      ...input,
      trialStartsAt: input.trialStartsAt ?? null,
      trialEndsAt: input.trialEndsAt ?? null
    },
    update: {
      variantId: input.variantId,
      status: input.status,
      periodStartsAt: input.periodStartsAt,
      periodEndsAt: input.periodEndsAt,
      trialStartsAt: input.trialStartsAt ?? null,
      trialEndsAt: input.trialEndsAt ?? null
    }
  })
  return mapSubscription(subscription)
}

export async function upsertBillingOrder(input: {
  customerId: string
  externalId: string
  variantId: string
  status: BillingOrderStatus
  store: string
}) {
  const order = await prisma.order.upsert({
    where: { externalId_store: { externalId: input.externalId, store: input.store } },
    create: input,
    update: {
      variantId: input.variantId,
      status: input.status
    }
  })
  return mapOrder(order)
}

export async function claimWebhookEvent(input: {
  eventId: string
  provider: string
  type: string
}): Promise<{ id: string } | null> {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO "billing"."webhook_event" (
      "id", "event_id", "provider", "type", "status",
      "received_at", "last_attempt_at", "attempt_count"
    ) VALUES (
      ${crypto.randomUUID()}, ${input.eventId}, ${input.provider}, ${input.type},
      'processing'::"billing"."WebhookEventStatus",
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1
    )
    ON CONFLICT ("event_id", "provider") DO UPDATE SET
      "status" = 'processing'::"billing"."WebhookEventStatus",
      "error" = NULL,
      "last_attempt_at" = CURRENT_TIMESTAMP,
      "attempt_count" = "billing"."webhook_event"."attempt_count" + 1
    WHERE "billing"."webhook_event"."status" = 'failed'::"billing"."WebhookEventStatus"
    RETURNING "id"
  `)
  return rows[0] ?? null
}

export async function completeWebhookEvent(id: string, status: 'processed' | 'skipped', error: string | null = null) {
  return prisma.webhookEvent.update({
    where: { id },
    data: {
      status,
      error,
      processedAt: new Date()
    }
  })
}

export async function failWebhookEvent(id: string, error: string) {
  return prisma.webhookEvent.update({
    where: { id },
    data: {
      status: 'failed',
      error,
      processedAt: null
    }
  })
}

export async function getBillingSummary(owner: BillingOwner) {
  const customerRecords = await getBillingCustomers(owner)
  if (customerRecords.length === 0) return []

  const customers = await prisma.customer.findMany({
    where: { id: { in: customerRecords.map(customer => customer.id) } },
    include: { subscriptions: true, orders: true },
    orderBy: { createdAt: 'desc' }
  })

  return customers.map(customer => ({
    ...mapCustomer(customer),
    subscriptions: customer.subscriptions.map(mapSubscription),
    orders: customer.orders.map(mapOrder)
  }))
}

export async function getBillingSummaryByReferenceId(referenceId: string) {
  return getBillingSummary({ kind: 'user', userId: referenceId })
}
