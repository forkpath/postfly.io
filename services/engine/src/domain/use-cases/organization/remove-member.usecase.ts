import type { IOrganizationRepository } from '../../repositories/organization.repository.interface'

import {
  CannotRemoveLastAdminException,
  CannotRemoveOwnerException,
  MemberNotFoundException,
  OrganizationNotFoundException
} from '../../exceptions/organization.exception'
import { MemberRole, MemberRoleEnum } from '../../value-objects/member-role.vo'

export interface RemoveMemberInput {
  organizationId: string
  memberId: string
}

export class RemoveMemberUseCase {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async execute(input: RemoveMemberInput): Promise<void> {
    const org = await this.organizationRepository.findById(input.organizationId)
    if (!org) {
      throw new OrganizationNotFoundException(input.organizationId)
    }

    const member = await this.organizationRepository.findMemberById(input.organizationId, input.memberId)
    if (!member) {
      throw new MemberNotFoundException(input.memberId)
    }

    const memberRole = MemberRole.create(member.role)

    if (memberRole.isOwner()) {
      throw new CannotRemoveOwnerException()
    }

    if (member.role === MemberRoleEnum.ADMIN) {
      const totalMembers = await this.organizationRepository.countMembers(input.organizationId)
      if (totalMembers <= 1) {
        throw new CannotRemoveLastAdminException()
      }
    }

    await this.organizationRepository.deleteMember(input.organizationId, input.memberId)
  }
}
