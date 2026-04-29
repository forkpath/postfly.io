import type { IQueryHandler } from '@nestjs/cqrs'
import type { GetOrganizationsReq, GetOrganizationsRes } from '@libs/payload'
import type { IOrganizationRepository } from '#/domain/repositories/organization.repository.interface'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { ORGANIZATION_REPOSITORY } from '#/domain/repositories/organization.repository.interface'

import { OrganizationMapper } from '../../mappers/organization.mapper'

export class ListOrganizationsQuery {
  constructor(public readonly params: GetOrganizationsReq) {}
}

@QueryHandler(ListOrganizationsQuery)
export class ListOrganizationsHandler implements IQueryHandler<ListOrganizationsQuery, GetOrganizationsRes> {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepository: IOrganizationRepository
  ) {}

  async execute(query: ListOrganizationsQuery): Promise<GetOrganizationsRes> {
    const result = await this.orgRepository.findAll(OrganizationMapper.toListOrganizationsCriteria(query.params))
    return OrganizationMapper.toOrganizationsResponse(result)
  }
}
