import type { IOrganizationRepository } from '../../../repositories/organization.repository.interface'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OrganizationNotFoundException,
  OrganizationSlugConflictException
} from '../../../exceptions/organization.exception'
import { UpdateOrganizationUseCase } from '../update-organization.usecase'

const baseOrg = {
  id: 'o1',
  name: 'Old Name',
  slug: 'old-slug',
  logo: null,
  createdAt: new Date(),
  membersCount: 2
}

describe('UpdateOrganizationUseCase', () => {
  let useCase: UpdateOrganizationUseCase
  let mockRepo: {
    findById: ReturnType<typeof vi.fn>
    findBySlug: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      update: vi.fn()
    }
    useCase = new UpdateOrganizationUseCase(mockRepo as unknown as IOrganizationRepository)
  })

  it('should update name only', async () => {
    const updated = { ...baseOrg, name: 'New Name' }
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.update.mockResolvedValue(updated)

    const result = await useCase.execute({
      organizationId: 'o1',
      name: 'New Name'
    })

    expect(mockRepo.findBySlug).not.toHaveBeenCalled()
    expect(mockRepo.update).toHaveBeenCalledWith('o1', {
      name: 'New Name',
      slug: undefined
    })
    expect(result.organization).toEqual(updated)
  })

  it('should update slug when no conflict', async () => {
    const updated = { ...baseOrg, slug: 'new-slug' }
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findBySlug.mockResolvedValue(null)
    mockRepo.update.mockResolvedValue(updated)

    const result = await useCase.execute({
      organizationId: 'o1',
      slug: 'new-slug'
    })

    expect(mockRepo.findBySlug).toHaveBeenCalledWith('new-slug')
    expect(mockRepo.update).toHaveBeenCalledWith('o1', {
      name: undefined,
      slug: 'new-slug'
    })
    expect(result.organization).toEqual(updated)
  })

  it('should throw OrganizationNotFoundException when org not found', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ organizationId: 'missing', name: 'X' })).rejects.toThrow(
      OrganizationNotFoundException
    )
  })

  it('should throw OrganizationSlugConflictException when slug taken by another org', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findBySlug.mockResolvedValue({
      id: 'o2',
      name: 'Other',
      slug: 'new-slug',
      logo: null,
      createdAt: new Date(),
      membersCount: 1
    })

    await expect(useCase.execute({ organizationId: 'o1', slug: 'new-slug' })).rejects.toThrow(
      OrganizationSlugConflictException
    )

    expect(mockRepo.update).not.toHaveBeenCalled()
  })
})
