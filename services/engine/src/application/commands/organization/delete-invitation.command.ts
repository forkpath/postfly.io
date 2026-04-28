import type { ICommandHandler } from '@nestjs/cqrs'
import type { IOrganizationRepository } from '#/domain/repositories/organization.repository.interface'

import { Inject } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '#/domain/repositories/organization.repository.interface'

export class DeleteInvitationCommand {
  constructor(
    public readonly orgId: string,
    public readonly invitationId: string
  ) {}
}

@CommandHandler(DeleteInvitationCommand)
export class DeleteInvitationHandler implements ICommandHandler<DeleteInvitationCommand, void> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {}

  async execute(command: DeleteInvitationCommand): Promise<void> {
    await this.orgRepository.deleteInvitation(command.orgId, command.invitationId)
  }
}
