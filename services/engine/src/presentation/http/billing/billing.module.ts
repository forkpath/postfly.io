import { Module } from '@nestjs/common'
import { CqrsModule } from '@nestjs/cqrs'

import { CreateBillingPortalHandler } from '#/application/commands/billing/create-billing-portal.command'
import { CreateCheckoutSessionHandler } from '#/application/commands/billing/create-checkout-session.command'
import { HandleRevenueCatWebhookHandler } from '#/application/commands/billing/handle-revenuecat-webhook.command'
import { HandleStripeWebhookHandler } from '#/application/commands/billing/handle-stripe-webhook.command'
import { GetBillingSummaryHandler } from '#/application/queries/billing/get-billing-summary.query'
import { BillingService } from '#/application/services/billing.service'

import { BillingController } from './billing.controller'

@Module({
  imports: [CqrsModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    GetBillingSummaryHandler,
    CreateCheckoutSessionHandler,
    CreateBillingPortalHandler,
    HandleStripeWebhookHandler,
    HandleRevenueCatWebhookHandler
  ]
})
export class BillingModule {}
