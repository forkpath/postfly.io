import type { ICommandHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '../../../domain/repositories/user.repository.interface'

import { Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '../../../domain/repositories/user.repository.interface'

/**
 * 设置用户密码命令（管理员操作）
 */
export class SetUserPasswordCommand {
  constructor(
    public readonly userId: string,
    public readonly newPassword: string
  ) {}
}

@CommandHandler(SetUserPasswordCommand)
export class SetUserPasswordHandler implements ICommandHandler<SetUserPasswordCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: SetUserPasswordCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    await this.userRepository.setPassword(command.userId, command.newPassword)
  }
}
