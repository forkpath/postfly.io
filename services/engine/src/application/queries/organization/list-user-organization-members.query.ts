import type { IQueryHandler } from '@nestjs/cqrs'
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface'
import type { GetMembersReq, GetMembersRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'
import { OrganizationMapper } from '../../mappers/organization.mapper'
import { UserOrganizationAccessService } from '../../services/user-organization-access.service'

export class ListUserOrganizationMembersQuery {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly params: GetMembersReq
  ) {}
}

@QueryHandler(ListUserOrganizationMembersQuery)
export class ListUserOrganizationMembersHandler
  implements IQueryHandler<ListUserOrganizationMembersQuery, GetMembersRes>
{
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository,
    private readonly accessService: UserOrganizationAccessService
  ) {}

  async execute(query: ListUserOrganizationMembersQuery): Promise<GetMembersRes> {
    await this.accessService.ensureMember(query.organizationId, query.userId)

    const result = await this.orgRepository.findMembers(query.organizationId, query.params)
    return {
      list: result.list.map(OrganizationMapper.toMemberResponse),
      total: result.total
    }
  }
}
