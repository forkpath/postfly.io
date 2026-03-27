import type { MemberEntity } from '../../entities/organization.entity'
import type { IOrganizationRepository } from '../../repositories/organization.repository.interface'
import type { UpdateMemberPayload } from '@libs/payload'

import { MemberNotFoundException, OrganizationNotFoundException } from '../../exceptions/organization.exception'
import { MemberRole } from '../../value-objects/member-role.vo'

export interface UpdateMemberRoleInput {
  organizationId: string
  memberId: string
  newRole: string
}

export interface UpdateMemberRoleOutput {
  member: MemberEntity
}

export class UpdateMemberRoleUseCase {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  async execute(input: UpdateMemberRoleInput): Promise<UpdateMemberRoleOutput> {
    const org = await this.organizationRepository.findById(input.organizationId)
    if (!org) {
      throw new OrganizationNotFoundException(input.organizationId)
    }

    const member = await this.organizationRepository.findMemberById(input.organizationId, input.memberId)
    if (!member) {
      throw new MemberNotFoundException(input.memberId)
    }

    MemberRole.create(input.newRole)

    const updated = await this.organizationRepository.updateMember(input.organizationId, input.memberId, {
      role: input.newRole
    } as UpdateMemberPayload)

    return { member: updated }
  }
}
