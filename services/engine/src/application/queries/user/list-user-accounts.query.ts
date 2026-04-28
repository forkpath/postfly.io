import type { IQueryHandler } from '@nestjs/cqrs'
import type { GetUserAccountsReq, GetUserAccountsRes } from '@libs/payload'
import type { IUserRepository } from '#/domain/repositories/user.repository.interface'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '#/domain/repositories/user.repository.interface'

export class ListUserAccountsQuery {
  constructor(
    public readonly userId: string,
    public readonly params: GetUserAccountsReq
  ) {}
}

@QueryHandler(ListUserAccountsQuery)
export class ListUserAccountsHandler implements IQueryHandler<ListUserAccountsQuery, GetUserAccountsRes> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: ListUserAccountsQuery): Promise<GetUserAccountsRes> {
    const r = await this.userRepository.findAccounts(query.userId, query.params)
    return { list: r.list, total: r.total }
  }
}
