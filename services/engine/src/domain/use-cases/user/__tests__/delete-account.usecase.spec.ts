import type { IUserRepository } from '../../../repositories/user.repository.interface'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  AccountNotFoundException,
  LastAccountCannotBeDeletedException,
  UserNotFoundException
} from '../../../exceptions/user.exception'
import { DeleteAccountUseCase } from '../delete-account.usecase'

describe('DeleteAccountUseCase', () => {
  let useCase: DeleteAccountUseCase
  let mockRepo: {
    findById: ReturnType<typeof vi.fn>
    countAccounts: ReturnType<typeof vi.fn>
    deleteAccount: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      countAccounts: vi.fn(),
      deleteAccount: vi.fn()
    }
    useCase = new DeleteAccountUseCase(mockRepo as unknown as IUserRepository)
  })

  it('should delete an account when user has multiple accounts', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1' })
    mockRepo.countAccounts.mockResolvedValue(2)
    mockRepo.deleteAccount.mockResolvedValue(undefined)

    await useCase.execute({ userId: 'u1', accountId: 'a1' })

    expect(mockRepo.deleteAccount).toHaveBeenCalledWith('u1', 'a1')
  })

  it('should throw UserNotFoundException if user does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ userId: 'u1', accountId: 'a1' })).rejects.toThrow(UserNotFoundException)
  })

  it('should throw LastAccountCannotBeDeletedException when only one account', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1' })
    mockRepo.countAccounts.mockResolvedValue(1)

    await expect(useCase.execute({ userId: 'u1', accountId: 'a1' })).rejects.toThrow(
      LastAccountCannotBeDeletedException
    )
  })

  it('should throw AccountNotFoundException if account delete fails', async () => {
    mockRepo.findById.mockResolvedValue({ id: 'u1' })
    mockRepo.countAccounts.mockResolvedValue(2)
    mockRepo.deleteAccount.mockRejectedValue(new Error('not found'))

    await expect(useCase.execute({ userId: 'u1', accountId: 'a-invalid' })).rejects.toThrow(AccountNotFoundException)
  })
})
