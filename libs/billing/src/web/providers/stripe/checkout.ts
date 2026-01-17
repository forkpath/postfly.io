import type { CheckoutPayload, GetBillingPortalPayload } from '../../schema'
import type { User } from '@libs/auth'
import type Stripe from 'stripe'

import { config } from '@libs/billing/common'
import { getCustomerByExternalId, upsertOrder } from '@libs/billing/common/server'
import { HttpStatusCode } from '@libs/common/constants'
import { HttpException } from '@libs/common/utils'

import { BillingProvider } from '../types'
import { createBillingPortalSession, createOrRetrieveCustomer } from './customer'
import { toCheckoutMode } from './mappers/to-checkout-mode'
import { toPaymentStatus } from './mappers/to-xxx-status'
import { stripe } from './sdk'
import { getPromotionCode, subscriptionStatusChangeHandler } from './subscription'

const createCheckoutSession = async (params: Stripe.Checkout.SessionCreateParams) => {
  try {
    return await stripe().checkout.sessions.create(params)
  } catch (e) {
    console.error(e)
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: 'xxx:error.checkout'
    })
  }
}

const getCheckoutSession = async (sessionId: string) => {
  try {
    return await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ['line_items']
    })
  } catch (e) {
    console.error(e)
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR, {
      code: 'xxx:error.checkoutRetrieve'
    })
  }
}

export const checkoutStatusChangeHandler = async (session: Stripe.Checkout.Session) => {
  const customerId = session.customer as string | null

  if (!customerId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: 'xxx:error.customerNotFound'
    })
  }

  if (session.mode === 'subscription') {
    await subscriptionStatusChangeHandler({
      id: session.subscription as string,
      customerId
    })
    return
  }

  const customer = await getCustomerByExternalId(customerId)

  if (!customer) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: 'xxx:error.customerNotFound'
    })
  }

  const checkoutSession = await getCheckoutSession(session.id)
  const variantId = checkoutSession.line_items?.data[0]?.price?.id

  if (!variantId) {
    throw new HttpException(HttpStatusCode.NOT_FOUND, {
      code: 'xxx:error.variantNotFound'
    })
  }

  const status = toPaymentStatus(checkoutSession.payment_status)

  await upsertOrder({
    customerId: customer.id,
    externalId: checkoutSession.id,
    status,
    variantId,
    store: BillingProvider.STRIPE
  })

  console.info(`✅ Checkout ${checkoutSession.id} status changed for customer ${customer.id} to ${status}`)
}

export const checkout = async ({ user, variant: { id }, discount, redirect }: CheckoutPayload & { user: User }) => {
  try {
    const variant = config.plans.find(plan => plan.variants.some(v => v.id === id))?.variants.find(v => v.id === id)

    if (!variant) {
      throw new HttpException(HttpStatusCode.NOT_FOUND, {
        code: 'xxx:error.variantNotFound'
      })
    }

    const { stripeCustomer } = await createOrRetrieveCustomer({
      userId: user.id,
      email: user.email
    })

    const code = discount?.code ? await getPromotionCode(discount.code) : null

    const session = await createCheckoutSession({
      mode: toCheckoutMode(variant.model),
      xxx_address_collection: 'required',
      customer: stripeCustomer.id,
      customer_update: {
        address: 'auto'
      },
      line_items: [
        {
          price: variant.id,
          quantity: 1
        }
      ],
      success_url: redirect.success,
      cancel_url: redirect.cancel,
      ...('trialDays' in variant && variant.trialDays
        ? {
            subscription_data: {
              trial_period_days: variant.trialDays
            }
          }
        : {}),
      ...(code && {
        discounts: [
          {
            promotion_code: code.id
          }
        ]
      })
    })

    return { url: session.url }
  } catch (e) {
    console.error(e)
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR)
  }
}

export const getBillingPortal = async ({ redirectUrl, user }: GetBillingPortalPayload & { user: User }) => {
  try {
    const { stripeCustomer } = await createOrRetrieveCustomer({
      userId: user.id,
      email: user.email
    })

    const { url } = await createBillingPortalSession({
      customer: stripeCustomer.id,
      return_url: redirectUrl
    })

    return { url }
  } catch (e) {
    console.error(e)
    throw new HttpException(HttpStatusCode.INTERNAL_SERVER_ERROR)
  }
}
