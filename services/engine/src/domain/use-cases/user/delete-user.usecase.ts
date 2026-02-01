import type { IUserRepository } from '../../repositories/user.repository.interface'

import { CannotOperateSelfException, UserNotFoundException } from '../../exceptions/user.exception'

export interface DeleteUserInput {
  userId: string
  operatorId: string
}

/**
 * 删除用户用例
 *
 * 领域层核心业务逻辑
 */
export class DeleteUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: DeleteUserInput): Promise<void> {
    // 业务规则：不能删除自己
    if (input.userId === input.operatorId) {
      throw new CannotOperateSelfException('delete')
    }

    // 验证用户存在
    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new UserNotFoundException(input.userId)
    }

    // 执行删除
    await this.userRepository.delete(input.userId)
  }
}
