import type { ICommandHandler } from '@nestjs/cqrs'
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface'

import { Inject } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'
import { RemoveMemberUseCase } from '../../../domain/use-cases/organization/remove-member.usecase'

export class DeleteMemberCommand {
  constructor(
    public readonly orgId: string,
    public readonly memberId: string
  ) {}
}

@CommandHandler(DeleteMemberCommand)
export class DeleteMemberHandler implements ICommandHandler<DeleteMemberCommand, void> {
  private readonly useCase: RemoveMemberUseCase

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {
    this.useCase = new RemoveMemberUseCase(this.orgRepository)
  }

  async execute(command: DeleteMemberCommand): Promise<void> {
    await this.useCase.execute({
      organizationId: command.orgId,
      memberId: command.memberId
    })
  }
}
