import { z } from 'zod'

import { offsetPaginationSchema } from '../shared/pagination.schema'
import { multiValueQuerySchema, rangeQuerySchema, sortQuerySchema } from '../shared/query-utils'

// ==================== Customers List ====================

export const getCustomersReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  provider: multiValueQuerySchema(z.string()).optional(),
  subscriptions: rangeQuerySchema.optional(),
  orders: rangeQuerySchema.optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetCustomersReq = z.infer<typeof getCustomersReqSchema>

export const getCustomersResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      referenceId: z.string(),
      provider: z.string(),
      externalId: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      user: z.object({
        name: z.string(),
        image: z.string().nullish()
      }),
      subscriptions: z.number(),
      orders: z.number()
    })
  ),
  total: z.number(),
  max: z.object({
    subscriptions: z.number(),
    orders: z.number()
  }),
  options: z.object({
    provider: z.array(z.string())
  })
})

export type GetCustomersRes = z.infer<typeof getCustomersResSchema>
