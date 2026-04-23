import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { BillingService } from '../../services/billing.service'

export class CreateCheckoutSessionCommand {
  constructor(
    public readonly input: {
      referenceId: string
      email: string
      variantId: string
      successUrl: string
      cancelUrl: string
    }
  ) {}
}

@CommandHandler(CreateCheckoutSessionCommand)
export class CreateCheckoutSessionHandler implements ICommandHandler<CreateCheckoutSessionCommand> {
  constructor(private readonly billingService: BillingService) {}

  execute(command: CreateCheckoutSessionCommand) {
    return this.billingService.createCheckoutSession(command.input)
  }
}
