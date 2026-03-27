export interface BillingCustomerEntity {
  readonly id: string
  readonly referenceId: string
  readonly provider: string
  readonly externalId: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly user: {
    readonly name: string
    readonly image: string | null
  }
  readonly subscriptionsCount: number
  readonly ordersCount: number
}
