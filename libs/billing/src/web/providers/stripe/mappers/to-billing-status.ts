import type Stripe from 'stripe'

import { PaymentStatus, SubscriptionStatus } from '@libs/billing/common'

export const toSubscriptionStatus = (status: string): SubscriptionStatus => {
  switch (status) {
    case 'active':
      return SubscriptionStatus.ACTIVE
    case 'trialing':
      return SubscriptionStatus.TRIALING
    case 'past_due':
      return SubscriptionStatus.PAST_DUE
    case 'incomplete':
      return SubscriptionStatus.INCOMPLETE
    case 'incomplete_expired':
      return SubscriptionStatus.INCOMPLETE_EXPIRED
    case 'canceled':
      return SubscriptionStatus.CANCELED
    case 'unpaid':
      return SubscriptionStatus.UNPAID
    case 'paused':
      return SubscriptionStatus.PAUSED

    default:
      throw new Error(`Invalid subscription status: ${status}`)
  }
}

export const toPaymentStatus = (status: Stripe.Checkout.Session.PaymentStatus): PaymentStatus => {
  switch (status) {
    case 'paid':
      return PaymentStatus.SUCCEEDED
    case 'unpaid':
      return PaymentStatus.FAILED
    case 'no_payment_required':
      return PaymentStatus.SUCCEEDED
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid payment status: ${status}`)
  }
}
