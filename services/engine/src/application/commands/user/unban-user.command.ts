import type { ICommandHandler } from '@nestjs/cqrs'
import type { UserResponse } from '../../dtos/user/user.dto'
import type { IUserRepository } from '#/domain/repositories/user.repository.interface'

import { Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '#/domain/repositories/user.repository.interface'

/**
 * 解封用户命令
 */
export class UnbanUserCommand {
  constructor(public readonly id: string) {}
}

@CommandHandler(UnbanUserCommand)
export class UnbanUserHandler implements ICommandHandler<UnbanUserCommand, UserResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: UnbanUserCommand): Promise<UserResponse> {
    const user = await this.userRepository.findById(command.id)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return this.userRepository.unban(command.id)
  }
}
