import type { IQueryHandler } from '@nestjs/cqrs'
import type { GetMembersReq, GetMembersRes } from '@libs/payload'
import type { IOrganizationRepository } from '#/domain/repositories/organization.repository.interface'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '#/domain/repositories/organization.repository.interface'

import { OrganizationMapper } from '../../mappers/organization.mapper'

export class ListMembersQuery {
  constructor(
    public readonly orgId: string,
    public readonly params: GetMembersReq
  ) {}
}

@QueryHandler(ListMembersQuery)
export class ListMembersHandler implements IQueryHandler<ListMembersQuery, GetMembersRes> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {}

  async execute(query: ListMembersQuery): Promise<GetMembersRes> {
    const result = await this.orgRepository.findMembers(query.orgId, query.params)
    return {
      list: result.list.map(OrganizationMapper.toMemberResponse),
      total: result.total
    }
  }
}
