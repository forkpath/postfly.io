import type { UserEntity } from '../../entities/user.entity'
import type { IUserRepository } from '../../repositories/user.repository.interface'

import { CannotOperateSelfException, UserNotFoundException } from '../../exceptions/user.exception'

export interface BanUserInput {
  userId: string
  operatorId: string
  reason?: string
  expiresAt?: Date
}

export interface BanUserOutput {
  user: UserEntity
}

/**
 * 封禁用户用例
 *
 * 领域层核心业务逻辑
 */
export class BanUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: BanUserInput): Promise<BanUserOutput> {
    // 业务规则：不能封禁自己
    if (input.userId === input.operatorId) {
      throw new CannotOperateSelfException('ban')
    }

    // 验证用户存在
    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new UserNotFoundException(input.userId)
    }

    // 执行封禁
    const bannedUser = await this.userRepository.ban(input.userId, input.reason, input.expiresAt)

    return { user: bannedUser }
  }
}
