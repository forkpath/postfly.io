import { Test } from '@nestjs/testing'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CUSTOMER_REPOSITORY } from '../../../../domain/repositories/customer.repository.interface'
import { ListCustomersHandler, ListCustomersQuery } from '../list-customers.query'

describe('ListCustomersHandler', () => {
  let handler: ListCustomersHandler
  const mockRepo = { findAll: vi.fn() }

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ListCustomersHandler, { provide: CUSTOMER_REPOSITORY, useValue: mockRepo }]
    }).compile()

    handler = module.get(ListCustomersHandler)
    vi.clearAllMocks()
  })

  it('should return customers with aggregation data', async () => {
    const repoResult = {
      list: [
        {
          id: 'c1',
          referenceId: 'u1',
          provider: 'stripe',
          externalId: 'cus_123',
          createdAt: new Date(),
          updatedAt: new Date(),
          user: { name: 'Test', image: null },
          subscriptionsCount: 2,
          ordersCount: 1
        }
      ],
      total: 1,
      max: { subscriptions: 2, orders: 1 },
      options: { provider: ['stripe'] }
    }
    mockRepo.findAll.mockResolvedValue(repoResult)

    const result = await handler.execute(new ListCustomersQuery({ page: 1, perPage: 10 }))

    expect(result.total).toBe(1)
    expect(result.max.subscriptions).toBe(2)
    expect(result.options.provider).toContain('stripe')
    expect(result.list[0].subscriptions).toBe(2)
  })
})
