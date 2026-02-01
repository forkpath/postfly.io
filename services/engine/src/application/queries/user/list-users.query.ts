import type { IQueryHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'
import type { PaginatedUsersResponse } from '../../dtos/user/user.dto'

import { Inject } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { UserListParams } from '../../../domain/entities/user.entity'
import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

/**
 * 获取用户列表查询
 */
export class ListUsersQuery {
  constructor(public readonly params: UserListParams) {}
}

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, PaginatedUsersResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: ListUsersQuery): Promise<PaginatedUsersResponse> {
    return this.userRepository.findMany(query.params)
  }
}
