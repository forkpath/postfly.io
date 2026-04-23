import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { BillingService } from '../../services/billing.service'

export class HandleStripeWebhookCommand {
  constructor(
    public readonly input: {
      payload: Buffer | string
      signature: string
    }
  ) {}
}

@CommandHandler(HandleStripeWebhookCommand)
export class HandleStripeWebhookHandler implements ICommandHandler<HandleStripeWebhookCommand> {
  constructor(private readonly billingService: BillingService) {}

  execute(command: HandleStripeWebhookCommand) {
    return this.billingService.handleStripeWebhook(command.input)
  }
}
