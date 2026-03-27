import type { IQueryHandler } from '@nestjs/cqrs'
import type { IOrganizationRepository } from '../../../domain/repositories/organization.repository.interface'
import type { GetInvitationsReq, GetInvitationsRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '../../../domain/repositories/organization.repository.interface'
import { OrganizationMapper } from '../../mappers/organization.mapper'

export class ListInvitationsQuery {
  constructor(
    public readonly orgId: string,
    public readonly params: GetInvitationsReq
  ) {}
}

@QueryHandler(ListInvitationsQuery)
export class ListInvitationsHandler implements IQueryHandler<ListInvitationsQuery, GetInvitationsRes> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {}

  async execute(query: ListInvitationsQuery): Promise<GetInvitationsRes> {
    const result = await this.orgRepository.findInvitations(query.orgId, query.params)
    return {
      list: result.list.map(OrganizationMapper.toInvitationResponse),
      total: result.total
    }
  }
}
