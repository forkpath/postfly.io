import { z } from 'zod'

export const checkoutReqSchema = z.object({
  variantId: z.string(),
  successUrl: z.url(),
  cancelUrl: z.url()
})

export type CheckoutReq = z.infer<typeof checkoutReqSchema>

export const billingPortalReqSchema = z.object({
  returnUrl: z.url()
})

export type BillingPortalReq = z.infer<typeof billingPortalReqSchema>
