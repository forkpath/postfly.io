import type { IQueryHandler } from '@nestjs/cqrs'
import type { UserResponse } from '../../dtos/user/user.dto'
import type { IUserRepository } from '#/domain/repositories/user.repository.interface'

import { Inject, NotFoundException } from '@nestjs/common'
import { QueryHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '#/domain/repositories/user.repository.interface'

/**
 * 获取单个用户查询
 */
export class GetUserQuery {
  constructor(public readonly id: string) {}
}

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery, UserResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(query: GetUserQuery): Promise<UserResponse> {
    const user = await this.userRepository.findById(query.id)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return user
  }
}
