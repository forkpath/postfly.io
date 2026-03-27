import { describe, expect, it } from 'vitest'

import { adminCustomerKeys, adminCustomerQueries } from '../customers'

describe('adminCustomerKeys', () => {
  it('should generate correct base key', () => {
    expect(adminCustomerKeys.all).toEqual(['admin', 'customers'])
  })

  it('should generate list key', () => {
    expect(adminCustomerKeys.lists()).toEqual(['admin', 'customers', 'list'])
  })

  it('should generate list key with params', () => {
    const params = { page: 2, q: 'test' }
    expect(adminCustomerKeys.list(params)).toEqual(['admin', 'customers', 'list', params])
  })
})

describe('adminCustomerQueries', () => {
  it('should have list query factory', () => {
    expect(typeof adminCustomerQueries.list).toBe('function')
  })
})
