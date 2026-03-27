import type { InvitationEntity, MemberEntity, OrganizationEntity } from '../../domain/entities/organization.entity'
import type { GetInvitationsRes, GetMembersRes, GetOrganizationRes, GetOrganizationsRes } from '@libs/payload'

type OrganizationListItem = GetOrganizationsRes['list'][number]
type MemberListItem = GetMembersRes['list'][number]
type InvitationListItem = GetInvitationsRes['list'][number]

export class OrganizationMapper {
  static toOrganizationListItem(entity: OrganizationEntity): OrganizationListItem {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      logo: entity.logo,
      createdAt: entity.createdAt,
      members: entity.membersCount
    }
  }

  static toOrganizationDetail(entity: OrganizationEntity): NonNullable<GetOrganizationRes> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      logo: entity.logo,
      createdAt: entity.createdAt
    }
  }

  static toMemberResponse(entity: MemberEntity): MemberListItem {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      role: entity.role as MemberListItem['role'],
      createdAt: entity.createdAt,
      userId: entity.userId,
      user: {
        id: entity.user.id,
        name: entity.user.name,
        email: entity.user.email,
        image: entity.user.image
      }
    }
  }

  static toInvitationResponse(entity: InvitationEntity): InvitationListItem {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role as InvitationListItem['role'],
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      inviterId: entity.inviterId,
      status: entity.status as InvitationListItem['status']
    }
  }
}
