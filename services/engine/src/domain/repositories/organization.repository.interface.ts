import type { InvitationEntity, MemberEntity, OrganizationEntity } from '../entities/organization.entity'
import type {
  GetInvitationsReq,
  GetMembersReq,
  GetOrganizationsReq,
  UpdateMemberPayload,
  UpdateOrganizationPayload
} from '@libs/payload'

export interface IOrganizationRepository {
  findAll(params: GetOrganizationsReq): Promise<{
    list: OrganizationEntity[]
    total: number
    max: { members: number }
  }>

  findById(id: string): Promise<OrganizationEntity | null>

  count(): Promise<number>

  update(id: string, data: UpdateOrganizationPayload): Promise<OrganizationEntity>

  delete(id: string): Promise<void>

  findBySlug(slug: string): Promise<OrganizationEntity | null>

  findMembers(orgId: string, params: GetMembersReq): Promise<{ list: MemberEntity[]; total: number }>

  findMemberById(orgId: string, memberId: string): Promise<MemberEntity | null>

  countMembers(orgId: string): Promise<number>

  updateMember(orgId: string, memberId: string, data: UpdateMemberPayload): Promise<MemberEntity>

  deleteMember(orgId: string, memberId: string): Promise<void>

  findInvitations(orgId: string, params: GetInvitationsReq): Promise<{ list: InvitationEntity[]; total: number }>

  deleteInvitation(orgId: string, invitationId: string): Promise<void>
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY')
