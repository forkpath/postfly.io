import type { IQueryHandler } from '@nestjs/cqrs'
import type { GetCustomersReq, GetCustomersRes } from '@libs/payload'
import type { ICustomerRepository } from '#/domain/repositories/customer.repository.interface'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { CUSTOMER_REPOSITORY } from '#/domain/repositories/customer.repository.interface'

import { CustomerMapper } from '../../mappers/customer.mapper'

export class ListCustomersQuery {
  constructor(public readonly params: GetCustomersReq) {}
}

@QueryHandler(ListCustomersQuery)
export class ListCustomersHandler implements IQueryHandler<ListCustomersQuery, GetCustomersRes> {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepository: ICustomerRepository
  ) {}

  async execute(query: ListCustomersQuery): Promise<GetCustomersRes> {
    const result = await this.customerRepository.findAll(query.params)
    return {
      list: result.list.map(CustomerMapper.toCustomerListItem),
      total: result.total,
      max: result.max,
      options: result.options
    }
  }
}
