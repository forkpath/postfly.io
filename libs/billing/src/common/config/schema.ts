import * as z from 'zod'

import { BillingDiscountType, BillingModel, BillingPlan, RecurringInterval } from '../types'

export const discountSchema = z.object({
  code: z.string(),
  type: z.enum(BillingDiscountType),
  off: z.number(),
  appliesTo: z.array(z.string())
})

const customVariantSchema = z.discriminatedUnion('custom', [
  z.object({
    custom: z.literal(true),
    label: z.string(),
    href: z.string()
  }),
  z.object({
    custom: z.literal(false).optional().default(false),
    cost: z.number(),
    currency: z.string().optional().default('usd')
  })
])

const sharedVariantSchema = z.intersection(
  customVariantSchema,
  z.object({
    id: z.string(),
    hidden: z.boolean().optional().default(false)
  })
)

const variantModelSchema = z.discriminatedUnion('model', [
  z.object({
    model: z.literal(BillingModel.ONE_TIME)
  }),
  z.object({
    model: z.literal(BillingModel.RECURRING),
    interval: z.enum(RecurringInterval),
    trialDays: z.number().positive().optional()
  })
])

export const variantSchema = z.intersection(sharedVariantSchema, variantModelSchema)

export const planSchema = z.object({
  id: z.enum(BillingPlan),
  name: z.string(),
  description: z.string(),
  badge: z.string().nullable().default(null),
  features: z.array(z.string()),
  variants: z.array(variantSchema)
})

export const billingConfigSchema = z.object({
  plans: z.array(planSchema).refine(
    plans => {
      const types = new Set(plans.map(plan => plan.id))
      return types.size === plans.length
    },
    {
      message: "You can't have two plans with the same id!"
    }
  ),
  discounts: z.array(discountSchema).optional().default([])
})

export type BillingConfig = z.infer<typeof billingConfigSchema>
export type BillingConfigPlan = z.infer<typeof planSchema>
export type BillingConfigVariant = z.infer<typeof variantSchema>
export type BillingConfigDiscount = z.infer<typeof discountSchema>
