import * as z from 'zod'

import {
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  getBillingCatalog,
  handleStripeWebhook
} from './lib/stripe'

export const checkoutSchema = z.object({
  variantId: z.string(),
  successUrl: z.url(),
  cancelUrl: z.url()
})

export const billingPortalSchema = z.object({
  returnUrl: z.url()
})

export type CheckoutPayload = z.infer<typeof checkoutSchema>
export type BillingPortalPayload = z.infer<typeof billingPortalSchema>

export { createStripeCheckoutSession, createStripeBillingPortalSession, handleStripeWebhook, getBillingCatalog }
