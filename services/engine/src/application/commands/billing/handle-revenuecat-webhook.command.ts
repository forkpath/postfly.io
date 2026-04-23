import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { BillingService } from '../../services/billing.service'

export class HandleRevenueCatWebhookCommand {
  constructor(
    public readonly input: {
      payload: Buffer | string | Record<string, unknown>
      authorization?: string
    }
  ) {}
}

@CommandHandler(HandleRevenueCatWebhookCommand)
export class HandleRevenueCatWebhookHandler implements ICommandHandler<HandleRevenueCatWebhookCommand> {
  constructor(private readonly billingService: BillingService) {}

  execute(command: HandleRevenueCatWebhookCommand) {
    return this.billingService.handleRevenueCatWebhook(command.input)
  }
}
