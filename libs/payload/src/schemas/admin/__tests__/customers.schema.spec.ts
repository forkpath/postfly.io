import { describe, expect, it } from 'vitest'

import { getCustomersReqSchema, getCustomersResSchema } from '../customers.schema'

const sortQuery = (value: unknown) => encodeURIComponent(JSON.stringify(value))

describe('getCustomersReqSchema', () => {
  it('parses a valid request', () => {
    const parsed = getCustomersReqSchema.parse({
      page: '1',
      perPage: '15',
      q: 'cust',
      sort: sortQuery([{ id: 'createdAt', desc: true }]),
      provider: ['stripe', 'revenuecat'],
      subscriptions: [0, 10] as [number, number],
      orders: [1, 5] as [number, number],
      createdAt: [1_600_000_000_000, 1_700_000_000_000] as [number, number]
    })

    expect(parsed.page).toBe(1)
    expect(parsed.perPage).toBe(15)
    expect(parsed.provider).toEqual(['stripe', 'revenuecat'])
    expect(parsed.subscriptions).toEqual([0, 10])
  })

  it('applies default pagination', () => {
    const parsed = getCustomersReqSchema.parse({})

    expect(parsed.page).toBe(1)
    expect(parsed.perPage).toBe(10)
  })
})

describe('getCustomersResSchema', () => {
  it('parses response with aggregations and options', () => {
    const parsed = getCustomersResSchema.parse({
      list: [
        {
          id: 'c1',
          referenceId: 'u1',
          provider: 'stripe',
          externalId: 'cus_x',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-02-01T00:00:00.000Z',
          user: {
            name: 'Ada',
            image: 'https://x/i.png'
          },
          subscriptions: 2,
          orders: 7
        }
      ],
      total: 1,
      max: { subscriptions: 99, orders: 50 },
      options: { provider: ['stripe', 'revenuecat'] }
    })

    expect(parsed.list[0].subscriptions).toBe(2)
    expect(parsed.max.orders).toBe(50)
    expect(parsed.options.provider).toEqual(['stripe', 'revenuecat'])
    expect(parsed.list[0].createdAt).toBeInstanceOf(Date)
  })

  it('accepts nested user with nullish image', () => {
    const parsed = getCustomersResSchema.parse({
      list: [
        {
          id: 'c2',
          referenceId: 'u2',
          provider: 'stripe',
          externalId: 'cus_y',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            name: 'B',
            image: null
          },
          subscriptions: 0,
          orders: 0
        }
      ],
      total: 1,
      max: { subscriptions: 0, orders: 0 },
      options: { provider: [] }
    })

    expect(parsed.list[0].user.image).toBeNull()
  })

  it('rejects missing options.provider', () => {
    const result = getCustomersResSchema.safeParse({
      list: [],
      total: 0,
      max: { subscriptions: 0, orders: 0 },
      options: {}
    })

    expect(result.success).toBe(false)
  })
})
