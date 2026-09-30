import { describe, expect, it } from 'vitest'

import { getCustomersReqSchema } from '../customers.schema'
import { getOrganizationsReqSchema } from '../organizations.schema'

describe.each([getCustomersReqSchema, getOrganizationsReqSchema])('admin list input boundaries', schema => {
  it.each(['createdAt, (select 1)', 'constructor', '__proto__', 'unknown'])('rejects unlisted sort %s', id => {
    expect(schema.safeParse({ sort: encodeURIComponent(JSON.stringify([{ id }])) }).success).toBe(false)
  })

  it.each(['%zz', '{broken', '{}', 'null'])('returns a validation result for malformed sort %s', sort => {
    expect(schema.safeParse({ sort }).success).toBe(false)
  })

  it.each([{ page: 0 }, { page: -1 }, { perPage: 0 }, { perPage: 101 }])('rejects invalid pagination %j', params => {
    expect(schema.safeParse(params).success).toBe(false)
  })
})
