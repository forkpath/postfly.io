import type { IUserRepository } from '../../repositories/user.repository.interface'

import {
  AccountNotFoundException,
  LastAccountCannotBeDeletedException,
  UserNotFoundException
} from '../../exceptions/user.exception'

export interface DeleteAccountInput {
  userId: string
  accountId: string
}

export class DeleteAccountUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(input: DeleteAccountInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId)
    if (!user) {
      throw new UserNotFoundException(input.userId)
    }

    const accountCount = await this.userRepository.countAccounts(input.userId)
    if (accountCount <= 1) {
      throw new LastAccountCannotBeDeletedException(input.userId)
    }

    try {
      await this.userRepository.deleteAccount(input.userId, input.accountId)
    } catch {
      throw new AccountNotFoundException(input.accountId)
    }
  }
}
