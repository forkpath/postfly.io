import { createZodDto } from 'nestjs-zod'

import { billingPortalReqSchema, checkoutReqSchema } from '@libs/payload'

export class CheckoutDto extends createZodDto(checkoutReqSchema) {}

export class BillingPortalDto extends createZodDto(billingPortalReqSchema) {}
