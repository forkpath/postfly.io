import type { IQueryHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'
import type { GetUserSubscriptionsReq, GetUserSubscriptionsRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

export class ListUserSubscriptionsQuery {
  constructor(
    public readonly userId: string,
    public readonly params: GetUserSubscriptionsReq
  ) {}
}

@QueryHandler(ListUserSubscriptionsQuery)
export class ListUserSubscriptionsHandler
  implements IQueryHandler<ListUserSubscriptionsQuery, GetUserSubscriptionsRes>
{
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: ListUserSubscriptionsQuery): Promise<GetUserSubscriptionsRes> {
    const r = await this.userRepository.findSubscriptions(query.userId, query.params)
    return { list: r.list, total: r.total }
  }
}
