import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { ListCustomersHandler } from '#/application/queries/customer/list-customers.query'
import { CUSTOMER_REPOSITORY } from '#/domain/repositories/customer.repository.interface'
import { CustomerRepository } from '#/infrastructure/repositories/customer.repository'

import { CustomerController } from './customer.controller'

const QueryHandlers = [ListCustomersHandler]

@Module({
  imports: [CqrsModule],
  controllers: [CustomerController],
  providers: [
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: CustomerRepository
    },
    ...QueryHandlers
  ],
  exports: [CUSTOMER_REPOSITORY]
})
export class CustomerModule {}
