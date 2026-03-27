import type { IOrganizationRepository } from '../../../repositories/organization.repository.interface'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CannotRemoveLastAdminException,
  CannotRemoveOwnerException,
  MemberNotFoundException,
  OrganizationNotFoundException
} from '../../../exceptions/organization.exception'
import { MemberRoleEnum } from '../../../value-objects/member-role.vo'
import { RemoveMemberUseCase } from '../remove-member.usecase'

const baseOrg = {
  id: 'o1',
  name: 'Acme',
  slug: 'acme',
  logo: null,
  createdAt: new Date(),
  membersCount: 3
}

const baseUser = {
  id: 'u1',
  name: 'Member',
  email: 'm@example.com',
  image: null as string | null
}

describe('RemoveMemberUseCase', () => {
  let useCase: RemoveMemberUseCase
  let mockRepo: {
    findById: ReturnType<typeof vi.fn>
    findMemberById: ReturnType<typeof vi.fn>
    countMembers: ReturnType<typeof vi.fn>
    deleteMember: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findMemberById: vi.fn(),
      countMembers: vi.fn(),
      deleteMember: vi.fn()
    }
    useCase = new RemoveMemberUseCase(mockRepo as unknown as IOrganizationRepository)
  })

  it('should remove a regular member', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      organizationId: 'o1',
      role: MemberRoleEnum.MEMBER,
      createdAt: new Date(),
      user: { ...baseUser }
    })
    mockRepo.deleteMember.mockResolvedValue(undefined)

    await useCase.execute({ organizationId: 'o1', memberId: 'm1' })

    expect(mockRepo.countMembers).not.toHaveBeenCalled()
    expect(mockRepo.deleteMember).toHaveBeenCalledWith('o1', 'm1')
  })

  it('should throw OrganizationNotFoundException when org not found', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(useCase.execute({ organizationId: 'missing', memberId: 'm1' })).rejects.toThrow(
      OrganizationNotFoundException
    )
  })

  it('should throw MemberNotFoundException when member not found', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue(null)

    await expect(useCase.execute({ organizationId: 'o1', memberId: 'missing' })).rejects.toThrow(
      MemberNotFoundException
    )
  })

  it('should throw CannotRemoveOwnerException when removing owner', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      organizationId: 'o1',
      role: MemberRoleEnum.OWNER,
      createdAt: new Date(),
      user: { ...baseUser }
    })

    await expect(useCase.execute({ organizationId: 'o1', memberId: 'm1' })).rejects.toThrow(CannotRemoveOwnerException)

    expect(mockRepo.deleteMember).not.toHaveBeenCalled()
  })

  it('should throw CannotRemoveLastAdminException when only one member is admin', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      organizationId: 'o1',
      role: MemberRoleEnum.ADMIN,
      createdAt: new Date(),
      user: { ...baseUser }
    })
    mockRepo.countMembers.mockResolvedValue(1)

    await expect(useCase.execute({ organizationId: 'o1', memberId: 'm1' })).rejects.toThrow(
      CannotRemoveLastAdminException
    )

    expect(mockRepo.deleteMember).not.toHaveBeenCalled()
  })
})
