import type { BillingCustomerEntity } from '../entities/customer.entity'
import type { GetCustomersReq } from '@libs/payload'

export interface ICustomerRepository {
  findAll(params: GetCustomersReq): Promise<{
    list: BillingCustomerEntity[]
    total: number
    max: { subscriptions: number; orders: number }
    options: { provider: string[] }
  }>

  count(): Promise<number>
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY')
