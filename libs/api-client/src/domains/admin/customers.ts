import type { GetCustomersRes } from '@libs/payload'

import { createQueryOptionsWithParams } from '../../lib/queries/factory'

// ==================== Keys ====================

export const adminCustomerKeys = {
  all: ['admin', 'customers'] as const,
  lists: () => [...adminCustomerKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...adminCustomerKeys.lists(), params] as const
} as const

export type AdminCustomerKeys = typeof adminCustomerKeys

// ==================== Queries ====================

export const adminCustomerQueries = {
  list: createQueryOptionsWithParams<GetCustomersRes, Error, GetCustomersRes, Record<string, unknown> | undefined>(
    (api, params) => ({
      queryKey: adminCustomerKeys.list(params),
      queryFn: () => api.get('/admin/customers', { params })
    })
  )
}
