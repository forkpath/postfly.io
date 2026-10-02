import { z } from 'zod'

import { sortSchema } from './sort.schema'

export const multiValueQuerySchema = <T extends z.ZodType>(value: T) =>
  z.union([value.transform(val => [val]), z.array(value)])

const decodedSort = z.string().transform((value, ctx): unknown => {
  try {
    return JSON.parse(decodeURIComponent(value))
  } catch {
    ctx.addIssue({ code: 'custom', message: 'Invalid sort query' })
    return z.NEVER
  }
})

export const sortQuerySchema = decodedSort.pipe(z.array(sortSchema).max(5))

// Table libraries expose dynamic string IDs. Keep that public input shape while
// enforcing each endpoint's field allowlist at the runtime validation boundary.
export const createSortQuerySchema = (field: z.ZodType<string>) =>
  sortQuerySchema.superRefine((items, ctx) => {
    items.forEach((item, index) => {
      if (!field.safeParse(item.id).success) {
        ctx.addIssue({ code: 'custom', path: [index, 'id'], message: 'Unsupported sort field' })
      }
    })
  })

export const rangeQuerySchema = z.tuple([z.coerce.number(), z.coerce.number()])
