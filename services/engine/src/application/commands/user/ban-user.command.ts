import type { ICommandHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'
import type { UserResponse } from '../../dtos/user/user.dto'

import { BadRequestException, Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

/**
 * 封禁用户命令
 */
export class BanUserCommand {
  constructor(
    public readonly id: string,
    public readonly operatorId: string,
    public readonly reason?: string,
    public readonly expiresAt?: Date
  ) {}
}

@CommandHandler(BanUserCommand)
export class BanUserHandler implements ICommandHandler<BanUserCommand, UserResponse> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: BanUserCommand): Promise<UserResponse> {
    // 不能封禁自己
    if (command.id === command.operatorId) {
      throw new BadRequestException('You cannot ban yourself')
    }
    const user = await this.userRepository.findById(command.id)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    return this.userRepository.ban(command.id, command.reason, command.expiresAt)
  }
}
