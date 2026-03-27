import type { ICommandHandler } from '@nestjs/cqrs'
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface'
import type { GetOrganizationRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'
import { UpdateOrganizationUseCase } from '../../../domain/use-cases/organization/update-organization.usecase'
import { OrganizationMapper } from '../../mappers/organization.mapper'

export class UpdateOrganizationCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly slug?: string
  ) {}
}

@CommandHandler(UpdateOrganizationCommand)
export class UpdateOrganizationHandler
  implements ICommandHandler<UpdateOrganizationCommand, NonNullable<GetOrganizationRes>>
{
  private readonly useCase: UpdateOrganizationUseCase

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {
    this.useCase = new UpdateOrganizationUseCase(this.orgRepository)
  }

  async execute(command: UpdateOrganizationCommand): Promise<NonNullable<GetOrganizationRes>> {
    const result = await this.useCase.execute({
      organizationId: command.id,
      name: command.name,
      slug: command.slug
    })
    return OrganizationMapper.toOrganizationDetail(result.organization)
  }
}
