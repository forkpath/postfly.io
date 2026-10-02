import type { ApiClient } from '../../../lib/client'

import { describe, expect, it, vi } from 'vitest'

import { adminCustomerQueries } from '../customers'
import { adminOrgQueries } from '../organizations'

describe.each([
  { list: adminCustomerQueries.list, path: '/admin/customers', field: 'user.name' },
  { list: adminOrgQueries.list, path: '/admin/organizations', field: 'name' }
])('admin list client $path', ({ list, path, field }) => {
  it('validates dynamic table fields and sends the supported wire encoding', async () => {
    const get = vi.fn().mockResolvedValue({ list: [], total: 0 })
    const api = { get } as unknown as ApiClient
    const query = list(api, { page: 1, perPage: 10, sort: [{ id: field, desc: false }] })
    await query.queryFn({ queryKey: query.queryKey, signal: AbortSignal.abort() })
    expect(get).toHaveBeenCalledWith(path, {
      params: { page: 1, perPage: 10, sort: encodeURIComponent(JSON.stringify([{ id: field, desc: false }])) }
    })
  })

  it('rejects unlisted fields before calling the transport', async () => {
    const get = vi.fn()
    const query = list({ get } as unknown as ApiClient, {
      page: 1,
      perPage: 10,
      sort: [{ id: 'createdAt, (select 1)', desc: false }]
    })
    await expect(query.queryFn({ queryKey: query.queryKey, signal: AbortSignal.abort() })).rejects.toThrow(
      'Unsupported sort field'
    )
    expect(get).not.toHaveBeenCalled()
  })
})
