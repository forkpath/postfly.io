import type { BillingCustomerEntity } from '../../domain/entities/customer.entity'
import type { GetCustomersRes } from '@libs/payload'

type CustomerListItem = GetCustomersRes['list'][number]

export class CustomerMapper {
  static toCustomerListItem(entity: BillingCustomerEntity): CustomerListItem {
    return {
      id: entity.id,
      referenceId: entity.referenceId,
      provider: entity.provider,
      externalId: entity.externalId,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      user: {
        name: entity.user.name,
        image: entity.user.image
      },
      subscriptions: entity.subscriptionsCount,
      orders: entity.ordersCount
    }
  }
}
