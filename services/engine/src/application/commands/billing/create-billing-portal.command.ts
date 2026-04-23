import type { ICommandHandler } from '@nestjs/cqrs'

import { CommandHandler } from '@nestjs/cqrs'

import { BillingService } from '../../services/billing.service'

export class CreateBillingPortalCommand {
  constructor(
    public readonly input: {
      referenceId: string
      email: string
      returnUrl: string
    }
  ) {}
}

@CommandHandler(CreateBillingPortalCommand)
export class CreateBillingPortalHandler implements ICommandHandler<CreateBillingPortalCommand> {
  constructor(private readonly billingService: BillingService) {}

  execute(command: CreateBillingPortalCommand) {
    return this.billingService.createBillingPortal(command.input)
  }
}
