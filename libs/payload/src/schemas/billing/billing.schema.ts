import { z } from 'zod'

const httpUrlSchema = z.url({ protocol: /^https?$/ })

export const checkoutReqSchema = z.object({
  variantId: z.string(),
  successUrl: httpUrlSchema,
  cancelUrl: httpUrlSchema
})

export type CheckoutReq = z.infer<typeof checkoutReqSchema>

export const billingPortalReqSchema = z.object({
  returnUrl: httpUrlSchema
})

export type BillingPortalReq = z.infer<typeof billingPortalReqSchema>

export const billingOwnerResSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('user'), userId: z.string().min(1) }),
  z.object({
    kind: z.literal('organization'),
    organizationId: z.string().min(1)
  })
])

export const billingSubscriptionResSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  externalId: z.string(),
  variantId: z.string(),
  status: z.enum([
    'active',
    'canceled',
    'incomplete',
    'incomplete_expired',
    'past_due',
    'paused',
    'trialing',
    'unpaid'
  ]),
  store: z.string(),
  periodStartsAt: z.coerce.date(),
  periodEndsAt: z.coerce.date(),
  trialStartsAt: z.coerce.date().nullable(),
  trialEndsAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export const billingOrderResSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  externalId: z.string(),
  variantId: z.string(),
  status: z.enum(['pending', 'succeeded', 'failed']),
  store: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export const billingSummaryCustomerResSchema = z.object({
  id: z.string(),
  referenceId: z.string(),
  userId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  externalId: z.string(),
  provider: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  owner: billingOwnerResSchema,
  subscriptions: z.array(billingSubscriptionResSchema),
  orders: z.array(billingOrderResSchema)
})

export const billingSummaryResSchema = z.array(billingSummaryCustomerResSchema)

export const billingRedirectResSchema = z.object({
  provider: z.literal('stripe'),
  url: httpUrlSchema.nullable()
})

export const billingPortalRedirectResSchema = billingRedirectResSchema.extend({
  url: httpUrlSchema
})

export type BillingOwnerRes = z.infer<typeof billingOwnerResSchema>
export type BillingSubscriptionRes = z.infer<typeof billingSubscriptionResSchema>
export type BillingOrderRes = z.infer<typeof billingOrderResSchema>
export type BillingSummaryCustomerRes = z.infer<typeof billingSummaryCustomerResSchema>
export type BillingSummaryRes = z.infer<typeof billingSummaryResSchema>
export type BillingRedirectRes = z.infer<typeof billingRedirectResSchema>
export type BillingPortalRedirectRes = z.infer<typeof billingPortalRedirectResSchema>
