import type { IOrganizationRepository } from '../../../repositories/organization.repository.interface'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MemberNotFoundException, OrganizationNotFoundException } from '../../../exceptions/organization.exception'
import { MemberRoleEnum } from '../../../value-objects/member-role.vo'
import { UpdateMemberRoleUseCase } from '../update-member-role.usecase'

const baseOrg = {
  id: 'o1',
  name: 'Acme',
  slug: 'acme',
  logo: null,
  createdAt: new Date(),
  membersCount: 2
}

const baseUser = {
  id: 'u1',
  name: 'Member',
  email: 'm@example.com',
  image: null as string | null
}

describe('UpdateMemberRoleUseCase', () => {
  let useCase: UpdateMemberRoleUseCase
  let mockRepo: {
    findById: ReturnType<typeof vi.fn>
    findMemberById: ReturnType<typeof vi.fn>
    updateMember: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findMemberById: vi.fn(),
      updateMember: vi.fn()
    }
    useCase = new UpdateMemberRoleUseCase(mockRepo as unknown as IOrganizationRepository)
  })

  it('should update member role', async () => {
    const member = {
      id: 'm1',
      userId: 'u1',
      organizationId: 'o1',
      role: MemberRoleEnum.MEMBER,
      createdAt: new Date(),
      user: { ...baseUser }
    }
    const updated = { ...member, role: MemberRoleEnum.ADMIN }
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue(member)
    mockRepo.updateMember.mockResolvedValue(updated)

    const result = await useCase.execute({
      organizationId: 'o1',
      memberId: 'm1',
      newRole: MemberRoleEnum.ADMIN
    })

    expect(mockRepo.updateMember).toHaveBeenCalledWith('o1', 'm1', {
      role: MemberRoleEnum.ADMIN
    })
    expect(result.member).toEqual(updated)
  })

  it('should throw OrganizationNotFoundException when org not found', async () => {
    mockRepo.findById.mockResolvedValue(null)

    await expect(
      useCase.execute({
        organizationId: 'missing',
        memberId: 'm1',
        newRole: MemberRoleEnum.MEMBER
      })
    ).rejects.toThrow(OrganizationNotFoundException)
  })

  it('should throw MemberNotFoundException when member not found', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue(null)

    await expect(
      useCase.execute({
        organizationId: 'o1',
        memberId: 'missing',
        newRole: MemberRoleEnum.MEMBER
      })
    ).rejects.toThrow(MemberNotFoundException)
  })

  it('should throw Error for invalid role value', async () => {
    mockRepo.findById.mockResolvedValue({ ...baseOrg })
    mockRepo.findMemberById.mockResolvedValue({
      id: 'm1',
      userId: 'u1',
      organizationId: 'o1',
      role: MemberRoleEnum.MEMBER,
      createdAt: new Date(),
      user: { ...baseUser }
    })

    await expect(
      useCase.execute({
        organizationId: 'o1',
        memberId: 'm1',
        newRole: 'invalid-role'
      })
    ).rejects.toThrow('Invalid member role: invalid-role')

    expect(mockRepo.updateMember).not.toHaveBeenCalled()
  })
})
