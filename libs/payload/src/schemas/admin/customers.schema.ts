import { z } from 'zod'

import { offsetPaginationSchema } from '../shared/pagination.schema'
import { createSortQuerySchema, multiValueQuerySchema, rangeQuerySchema } from '../shared/query-utils'

// ==================== Customers List ====================

export const getCustomersReqSchema = offsetPaginationSchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
  sort: createSortQuerySchema(
    z.enum([
      'id',
      'referenceId',
      'externalId',
      'provider',
      'createdAt',
      'updatedAt',
      'user.name',
      'subscriptions',
      'orders'
    ])
  ).optional(),
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
