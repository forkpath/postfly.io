import type { GetCustomersReq, GetCustomersRes } from '@libs/payload'

import { getCustomersReqSchema } from '@libs/payload'

import { createQueryOptionsWithParams } from '../../lib/queries/factory'

function serializeSort(sort?: { id: string; desc?: boolean }[]) {
  return sort?.length ? encodeURIComponent(JSON.stringify(sort)) : undefined
}

function serializeQueryParams<T extends object | undefined>(params: T) {
  if (!params) {
    return params
  }

  const rawParams = params as Record<string, unknown>

  return {
    ...rawParams,
    sort: Array.isArray(rawParams['sort'])
      ? serializeSort(rawParams['sort'] as { id: string; desc?: boolean }[])
      : rawParams['sort']
  }
}

// ==================== Keys ====================

export const adminCustomerKeys = {
  all: ['admin', 'customers'] as const,
  lists: () => [...adminCustomerKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...adminCustomerKeys.lists(), params] as const
} as const

export type AdminCustomerKeys = typeof adminCustomerKeys

// ==================== Queries ====================

export const adminCustomerQueries = {
  list: createQueryOptionsWithParams<GetCustomersRes, Error, GetCustomersRes, GetCustomersReq | undefined>(
    (api, params) => ({
      queryKey: adminCustomerKeys.list(params ? ({ ...params } as Record<string, unknown>) : undefined),
      queryFn: async () => {
        const serialized = serializeQueryParams(params)
        getCustomersReqSchema.parse(serialized ?? {})
        return api.get('/admin/customers', { params: serialized })
      }
    })
  )
}
