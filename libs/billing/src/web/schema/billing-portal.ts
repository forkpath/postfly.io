import * as z from 'zod'

export const getBillingPortalSchema = z.object({
  redirectUrl: z.url()
})

export type GetBillingPortalPayload = z.infer<typeof getBillingPortalSchema>
