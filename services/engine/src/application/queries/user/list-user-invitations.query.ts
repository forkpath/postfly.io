import type { IQueryHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'
import type { GetUserInvitationsReq, GetUserInvitationsRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

export class ListUserInvitationsQuery {
  constructor(
    public readonly userId: string,
    public readonly params: GetUserInvitationsReq
  ) {}
}

@QueryHandler(ListUserInvitationsQuery)
export class ListUserInvitationsHandler implements IQueryHandler<ListUserInvitationsQuery, GetUserInvitationsRes> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: ListUserInvitationsQuery): Promise<GetUserInvitationsRes> {
    const r = await this.userRepository.findInvitations(query.userId, query.params)
    return { list: r.list, total: r.total } as unknown as GetUserInvitationsRes
  }
}
