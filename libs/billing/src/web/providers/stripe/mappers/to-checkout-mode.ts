import type Stripe from 'stripe'

import { BillingModel } from '@libs/billing/common'

export const toCheckoutMode = (model: BillingModel): Stripe.Checkout.SessionCreateParams.Mode => {
  switch (model) {
    case BillingModel.ONE_TIME:
      return 'payment'
    case BillingModel.RECURRING:
      return 'subscription'
    default:
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      throw new Error(`Invalid billing model: ${model}`)
  }
}
