import type { ICommandHandler } from '@nestjs/cqrs'
import type { IUserRepository } from '#/domain/repositories/user.repository.interface'

import { BadRequestException, Inject, NotFoundException } from '@nestjs/common'
import { CommandHandler } from '@nestjs/cqrs'

import { USER_REPOSITORY } from '#/domain/repositories/user.repository.interface'

/**
 * 删除用户命令
 */
export class DeleteUserCommand {
  constructor(
    public readonly id: string,
    public readonly operatorId: string
  ) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    // 不能删除自己
    if (command.id === command.operatorId) {
      throw new BadRequestException('You cannot delete yourself')
    }
    const user = await this.userRepository.findById(command.id)
    if (!user) {
      throw new NotFoundException('User not found')
    }
    await this.userRepository.delete(command.id)
  }
}
