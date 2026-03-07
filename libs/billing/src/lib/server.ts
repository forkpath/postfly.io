import type {
  BillingCustomerRecord,
  BillingOrderRecord,
  BillingOrderStatus,
  BillingReferenceType as BillingReferenceTypeValue,
  BillingSubscriptionRecord,
  BillingSubscriptionStatus
} from './types'
import type { Prisma } from '@libs/pg-dao/generated/prisma/client'

import { prisma } from '@libs/pg-dao'

import { BillingProvider, BillingReferenceType } from './types'

function toRecord<T>(value: unknown): T | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  return value as T
}

function toJsonInput(value?: Record<string, unknown>) {
  return value as Prisma.InputJsonValue | undefined
}

function mapCustomer(input: {
  id: string
  referenceId: string
  referenceType: string
  provider: string
  externalId: string
  email: string | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}): BillingCustomerRecord {
  return {
    id: input.id,
    referenceId: input.referenceId,
    referenceType: input.referenceType as BillingReferenceTypeValue,
    provider: input.provider as BillingProvider,
    externalId: input.externalId,
    email: input.email,
    metadata: toRecord<Record<string, unknown>>(input.metadata),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  }
}

function mapSubscription(input: {
  id: string
  customerId: string
  provider: string
  externalId: string
  planId: string
  variantId: string
  status: string
  interval: string | null
  currency: string | null
  amount: number | null
  cancelAtPeriodEnd: boolean
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}): BillingSubscriptionRecord {
  return {
    id: input.id,
    customerId: input.customerId,
    provider: input.provider as BillingProvider,
    externalId: input.externalId,
    planId: input.planId,
    variantId: input.variantId,
    status: input.status as BillingSubscriptionStatus,
    interval: input.interval as BillingSubscriptionRecord['interval'],
    currency: input.currency,
    amount: input.amount,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    trialEndsAt: input.trialEndsAt,
    metadata: toRecord<Record<string, unknown>>(input.metadata),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  }
}

function mapOrder(input: {
  id: string
  customerId: string
  provider: string
  externalId: string
  planId: string
  variantId: string
  status: string
  currency: string | null
  amount: number | null
  metadata: unknown
  createdAt: Date
  updatedAt: Date
}): BillingOrderRecord {
  return {
    id: input.id,
    customerId: input.customerId,
    provider: input.provider as BillingProvider,
    externalId: input.externalId,
    planId: input.planId,
    variantId: input.variantId,
    status: input.status as BillingOrderStatus,
    currency: input.currency,
    amount: input.amount,
    metadata: toRecord<Record<string, unknown>>(input.metadata),
    createdAt: input.createdAt,
    updatedAt: input.updatedAt
  }
}

export async function getBillingCustomersByReferenceId(referenceId: string, provider?: BillingProvider) {
  const customers = await prisma.billingCustomer.findMany({
    where: {
      referenceId,
      ...(provider ? { provider } : {})
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return customers.map(mapCustomer)
}

export async function getBillingCustomerByExternalId(externalId: string, provider: BillingProvider) {
  const customer = await prisma.billingCustomer.findUnique({
    where: {
      externalId_provider: {
        externalId,
        provider
      }
    }
  })

  return customer ? mapCustomer(customer) : null
}

export async function upsertBillingCustomer(input: {
  referenceId: string
  referenceType?: BillingReferenceTypeValue
  provider: BillingProvider
  externalId: string
  email?: string | null
  metadata?: Record<string, unknown>
}) {
  const customer = await prisma.billingCustomer.upsert({
    where: {
      externalId_provider: {
        externalId: input.externalId,
        provider: input.provider
      }
    },
    create: {
      referenceId: input.referenceId,
      referenceType: input.referenceType ?? BillingReferenceType.USER,
      provider: input.provider,
      externalId: input.externalId,
      email: input.email ?? null,
      metadata: toJsonInput(input.metadata)
    },
    update: {
      referenceId: input.referenceId,
      referenceType: input.referenceType ?? BillingReferenceType.USER,
      email: input.email ?? null,
      metadata: toJsonInput(input.metadata)
    }
  })

  return mapCustomer(customer)
}

export async function upsertBillingSubscription(input: {
  customerId: string
  provider: BillingProvider
  externalId: string
  planId: string
  variantId: string
  status: BillingSubscriptionStatus
  interval?: BillingSubscriptionRecord['interval']
  currency?: string | null
  amount?: number | null
  cancelAtPeriodEnd?: boolean
  currentPeriodStart?: Date | null
  currentPeriodEnd?: Date | null
  trialEndsAt?: Date | null
  metadata?: Record<string, unknown>
}) {
  const subscription = await prisma.billingSubscription.upsert({
    where: {
      externalId_provider: {
        externalId: input.externalId,
        provider: input.provider
      }
    },
    create: {
      customerId: input.customerId,
      provider: input.provider,
      externalId: input.externalId,
      planId: input.planId,
      variantId: input.variantId,
      status: input.status,
      interval: input.interval ?? null,
      currency: input.currency ?? null,
      amount: input.amount ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      metadata: toJsonInput(input.metadata)
    },
    update: {
      planId: input.planId,
      variantId: input.variantId,
      status: input.status,
      interval: input.interval ?? null,
      currency: input.currency ?? null,
      amount: input.amount ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      trialEndsAt: input.trialEndsAt ?? null,
      metadata: toJsonInput(input.metadata)
    }
  })

  return mapSubscription(subscription)
}

export async function upsertBillingOrder(input: {
  customerId: string
  provider: BillingProvider
  externalId: string
  planId: string
  variantId: string
  status: BillingOrderStatus
  currency?: string | null
  amount?: number | null
  metadata?: Record<string, unknown>
}) {
  const order = await prisma.billingOrder.upsert({
    where: {
      externalId_provider: {
        externalId: input.externalId,
        provider: input.provider
      }
    },
    create: {
      customerId: input.customerId,
      provider: input.provider,
      externalId: input.externalId,
      planId: input.planId,
      variantId: input.variantId,
      status: input.status,
      currency: input.currency ?? null,
      amount: input.amount ?? null,
      metadata: toJsonInput(input.metadata)
    },
    update: {
      planId: input.planId,
      variantId: input.variantId,
      status: input.status,
      currency: input.currency ?? null,
      amount: input.amount ?? null,
      metadata: toJsonInput(input.metadata)
    }
  })

  return mapOrder(order)
}

export async function saveBillingWebhookEvent(input: {
  customerId?: string
  provider: BillingProvider
  externalId?: string
  eventType: string
  payload: Record<string, unknown>
  processedAt?: Date
}) {
  return prisma.billingWebhookEvent.create({
    data: {
      customerId: input.customerId,
      provider: input.provider,
      externalId: input.externalId,
      eventType: input.eventType,
      payload: input.payload as Prisma.InputJsonValue,
      processedAt: input.processedAt ?? null
    }
  })
}

export async function getBillingSummaryByReferenceId(referenceId: string) {
  const customers = await prisma.billingCustomer.findMany({
    where: {
      referenceId
    },
    include: {
      subscriptions: true,
      orders: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return {
    customers: customers.map(mapCustomer),
    subscriptions: customers.flatMap(customer => customer.subscriptions.map(mapSubscription)),
    orders: customers.flatMap(customer => customer.orders.map(mapOrder))
  }
}
