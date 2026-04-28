import type { ICommandHandler } from '@nestjs/cqrs'
import type { UserResponse } from '../../dtos/user/user.dto'
import type { IUserRepository } from '#/domain/repositories/user.repository.interface'

import { Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { UserRole } from '#/domain/entities/user.entity'
import { USER_REPOSITORY } from '#/domain/repositories/user.repository.interface'

export interface UpdateUserData {
  name?: string
  image?: string | null
  role?: UserRole
}

/**
 * 更新用户命令
 */
export class UpdateUserCommand {
  constructor(
    public readonly id: string,
    public readonly data: UpdateUserData
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, UserResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: UpdateUserCommand): Promise<UserResponse> {
    const user = await this.userRepository.findById(command.id)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return this.userRepository.update(command.id, command.data)
  }
}
