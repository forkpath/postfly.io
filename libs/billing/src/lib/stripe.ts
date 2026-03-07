import type { BillingCheckoutInput, BillingPortalInput } from './types'

import Stripe from 'stripe'

import { serverEnv } from '../env'
import { billingConfig } from './config'
import {
  getBillingCustomerByExternalId,
  saveBillingWebhookEvent,
  upsertBillingCustomer,
  upsertBillingOrder,
  upsertBillingSubscription
} from './server'
import {
  BillingModel,
  BillingOrderStatus,
  BillingProvider,
  BillingReferenceType,
  BillingSubscriptionStatus
} from './types'
import { findBillingVariant, findBillingVariantByStripePriceId } from './utils'

let stripeClient: Stripe | null = null

function getStripeClient(): Stripe {
  if (!serverEnv.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }

  if (!stripeClient) {
    stripeClient = new Stripe(serverEnv.STRIPE_SECRET_KEY)
  }

  return stripeClient
}

function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  switch (status) {
    case 'trialing':
      return BillingSubscriptionStatus.TRIALING
    case 'active':
      return BillingSubscriptionStatus.ACTIVE
    case 'past_due':
      return BillingSubscriptionStatus.PAST_DUE
    case 'unpaid':
      return BillingSubscriptionStatus.UNPAID
    case 'paused':
      return BillingSubscriptionStatus.PAUSED
    case 'incomplete':
    case 'incomplete_expired':
      return BillingSubscriptionStatus.INCOMPLETE
    case 'canceled':
    default:
      return BillingSubscriptionStatus.CANCELED
  }
}

function mapStripePaymentStatus(status: Stripe.Checkout.Session.PaymentStatus) {
  switch (status) {
    case 'paid':
      return BillingOrderStatus.SUCCEEDED
    case 'unpaid':
      return BillingOrderStatus.PENDING
    case 'no_payment_required':
      return BillingOrderStatus.SUCCEEDED
    default:
      return BillingOrderStatus.FAILED
  }
}

async function createOrRetrieveStripeCustomer(input: {
  referenceId: string
  referenceType?: BillingReferenceType
  email: string
}) {
  const stripe = getStripeClient()
  const existingCustomers = await stripe.customers.list({
    email: input.email,
    limit: 1
  })

  const stripeCustomer =
    existingCustomers.data[0] ??
    (await stripe.customers.create({
      email: input.email,
      metadata: {
        referenceId: input.referenceId,
        referenceType: input.referenceType ?? BillingReferenceType.USER
      }
    }))

  const customer = await upsertBillingCustomer({
    referenceId: input.referenceId,
    referenceType: input.referenceType ?? BillingReferenceType.USER,
    provider: BillingProvider.STRIPE,
    externalId: stripeCustomer.id,
    email: input.email,
    metadata: stripeCustomer.metadata
  })

  return {
    stripeCustomer,
    customer
  }
}

export async function createStripeCheckoutSession(input: BillingCheckoutInput) {
  const stripe = getStripeClient()
  const variant = findBillingVariant(input.variantId)

  if (!variant) {
    throw new Error(`Unknown billing variant: ${input.variantId}`)
  }

  if (!variant.stripePriceId) {
    throw new Error(`Stripe price is not configured for variant: ${input.variantId}`)
  }

  const { stripeCustomer } = await createOrRetrieveStripeCustomer({
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    email: input.email
  })

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomer.id,
    mode: variant.model === BillingModel.RECURRING ? 'subscription' : 'payment',
    billing_address_collection: 'required',
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    line_items: [
      {
        price: variant.stripePriceId,
        quantity: 1
      }
    ],
    customer_update: {
      address: 'auto'
    },
    metadata: {
      referenceId: input.referenceId,
      referenceType: input.referenceType ?? BillingReferenceType.USER,
      variantId: variant.id,
      planId: variant.planId
    },
    ...(variant.trialDays && variant.model === BillingModel.RECURRING
      ? {
          subscription_data: {
            trial_period_days: variant.trialDays,
            metadata: {
              referenceId: input.referenceId,
              referenceType: input.referenceType ?? BillingReferenceType.USER,
              variantId: variant.id,
              planId: variant.planId
            }
          }
        }
      : {})
  })

  return {
    provider: BillingProvider.STRIPE,
    url: session.url
  }
}

export async function createStripeBillingPortalSession(input: BillingPortalInput) {
  const stripe = getStripeClient()
  const { stripeCustomer } = await createOrRetrieveStripeCustomer({
    referenceId: input.referenceId,
    referenceType: input.referenceType,
    email: input.email
  })

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomer.id,
    return_url: input.returnUrl
  })

  return {
    provider: BillingProvider.STRIPE,
    url: session.url
  }
}

async function syncStripeSubscription(input: { stripeSubscription: Stripe.Subscription; stripeCustomerId: string }) {
  const customer = await getBillingCustomerByExternalId(input.stripeCustomerId, BillingProvider.STRIPE)

  if (!customer) {
    return
  }

  const priceId = input.stripeSubscription.items.data[0]?.price.id
  const variant = priceId ? findBillingVariantByStripePriceId(priceId) : undefined

  if (!variant) {
    return
  }

  await upsertBillingSubscription({
    customerId: customer.id,
    provider: BillingProvider.STRIPE,
    externalId: input.stripeSubscription.id,
    planId: variant.planId,
    variantId: variant.id,
    status: mapStripeSubscriptionStatus(input.stripeSubscription.status),
    interval: variant.interval,
    currency: input.stripeSubscription.currency?.toUpperCase() ?? null,
    amount: input.stripeSubscription.items.data[0]?.price.unit_amount ?? null,
    cancelAtPeriodEnd: input.stripeSubscription.cancel_at_period_end,
    currentPeriodStart: input.stripeSubscription.items.data[0]?.current_period_start
      ? new Date(input.stripeSubscription.items.data[0].current_period_start * 1000)
      : null,
    currentPeriodEnd: input.stripeSubscription.items.data[0]?.current_period_end
      ? new Date(input.stripeSubscription.items.data[0].current_period_end * 1000)
      : null,
    trialEndsAt: input.stripeSubscription.trial_end ? new Date(input.stripeSubscription.trial_end * 1000) : null,
    metadata: input.stripeSubscription.metadata
  })
}

async function syncStripeCheckout(input: { checkoutSession: Stripe.Checkout.Session }) {
  const stripeCustomerId = typeof input.checkoutSession.customer === 'string' ? input.checkoutSession.customer : null

  if (!stripeCustomerId) {
    return
  }

  const customer = await getBillingCustomerByExternalId(stripeCustomerId, BillingProvider.STRIPE)

  if (!customer) {
    return
  }

  const variantId = input.checkoutSession.metadata?.['variantId']
  const planId = input.checkoutSession.metadata?.['planId']

  if (!variantId || !planId) {
    return
  }

  await upsertBillingOrder({
    customerId: customer.id,
    provider: BillingProvider.STRIPE,
    externalId: input.checkoutSession.id,
    planId,
    variantId,
    status: mapStripePaymentStatus(input.checkoutSession.payment_status),
    currency: input.checkoutSession.currency?.toUpperCase() ?? null,
    amount: input.checkoutSession.amount_total ?? null,
    metadata: input.checkoutSession.metadata
      ? {
          ...input.checkoutSession.metadata
        }
      : undefined
  })
}

export async function handleStripeWebhook(input: { payload: string | Buffer; signature: string }) {
  const stripe = getStripeClient()

  if (!serverEnv.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }

  const event = stripe.webhooks.constructEvent(input.payload, input.signature, serverEnv.STRIPE_WEBHOOK_SECRET)

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : ''
      await syncStripeSubscription({
        stripeSubscription: subscription,
        stripeCustomerId
      })
      break
    }
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
    case 'checkout.session.async_payment_failed': {
      await syncStripeCheckout({
        checkoutSession: event.data.object as Stripe.Checkout.Session
      })
      break
    }
  }

  await saveBillingWebhookEvent({
    provider: BillingProvider.STRIPE,
    externalId: event.id,
    eventType: event.type,
    payload: event as unknown as Record<string, unknown>,
    processedAt: new Date()
  })

  return {
    received: true,
    type: event.type
  }
}

export function getBillingCatalog() {
  return billingConfig
}
