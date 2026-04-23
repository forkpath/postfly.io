import type { IQueryHandler } from '@nestjs/cqrs'

import { QueryHandler } from '@nestjs/cqrs'

import { BillingService } from '../../services/billing.service'

export class GetBillingSummaryQuery {
  constructor(public readonly userId: string) {}
}

@QueryHandler(GetBillingSummaryQuery)
export class GetBillingSummaryHandler implements IQueryHandler<GetBillingSummaryQuery> {
  constructor(private readonly billingService: BillingService) {}

  execute(query: GetBillingSummaryQuery) {
    return this.billingService.getSummary(query.userId)
  }
}
