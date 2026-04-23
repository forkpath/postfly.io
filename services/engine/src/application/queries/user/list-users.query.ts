import type { IQueryHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'
import type { GetUsersReq, GetUsersRes } from '@libs/payload'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

/**
 * 获取用户列表查询
 */
export class ListUsersQuery {
  constructor(public readonly params: GetUsersReq) {}
}

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, GetUsersRes> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: ListUsersQuery): Promise<GetUsersRes> {
    return this.userRepository.findMany(query.params)
  }
}
