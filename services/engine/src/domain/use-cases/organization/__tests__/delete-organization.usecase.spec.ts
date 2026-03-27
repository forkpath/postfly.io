import type { IOrganizationRepository } from '../../../repositories/organization.repository.interface'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrganizationNotFoundException } from '../../../exceptions/organization.exception'
import { DeleteOrganizationUseCase } from '../delete-organization.usecase'

describe('DeleteOrganizationUseCase', () => {
  let useCase: DeleteOrganizationUseCase
  let mockRepo: {
    findById: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      delete: vi.fn()
    }
    useCase = new DeleteOrganizationUseCase(mockRepo as unknown as IOrganizationRepository)
  })

  it('should delete when organization exists', async () => {
    mockRepo.findById.mockResolvedValue({
      id: 'o1',
      name: 'Acme',
      slug: 'acme',
      logo: null,
      createdAt: new Date(),
      membersCount: 1
    })
    mockRepo.delete.mockResolvedValue(undefined)

    await useCase.execute({ organizationId: 'o1' })

    expect(mockRepo.delete).toHaveBeenCalledWith('o1')
  })

  it('should throw OrganizationNotFoundException when org not found', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ organizationId: 'missing' })).rejects.toThrow(OrganizationNotFoundException)

    expect(mockRepo.delete).not.toHaveBeenCalled()
  })
})
