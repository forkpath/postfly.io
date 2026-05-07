import { describe, expect, it } from 'vitest'

import { CannotRemoveOwnerException } from '../../exceptions/organization.exception'
import { InvitationStatus } from '../../value-objects/invitation-status.vo'
import { MemberRole, MemberRoleEnum } from '../../value-objects/member-role.vo'
import { OrganizationId } from '../../value-objects/organization-id.vo'
import { OrganizationSlug } from '../../value-objects/organization-slug.vo'
import { Invitation, Member, Organization } from '../organization.entity'

const now = new Date('2026-04-28T00:00:00.000Z')

describe('Organization', () => {
  it('reconstitutes with value objects and changes slug through behaviour', () => {
    const organization = Organization.fromPersistence({
      id: 'org_1',
      name: 'Acme',
      slug: 'acme',
      logo: null,
      createdAt: now,
      membersCount: 3
    })

    organization.changeSlug(OrganizationSlug.create('acme-labs'))

    expect(organization.id).toBeInstanceOf(OrganizationId)
    expect(organization.slug?.toString()).toBe('acme-labs')
    expect(organization.name).toBe('Acme')
  })
})

describe('Member', () => {
  it('wraps role with MemberRole value object', () => {
    const member = Member.fromPersistence({
      id: 'member_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: MemberRoleEnum.ADMIN,
      createdAt: now,
      user: {
        id: 'user_1',
        name: 'Ada',
        email: 'ada@example.com',
        image: null
      }
    })

    expect(member.role).toBeInstanceOf(MemberRole)
    expect(member.role.toString()).toBe(MemberRoleEnum.ADMIN)
  })

  it('rejects removing an owner member', () => {
    const member = Member.fromPersistence({
      id: 'member_1',
      userId: 'user_1',
      organizationId: 'org_1',
      role: MemberRoleEnum.OWNER,
      createdAt: now,
      user: {
        id: 'user_1',
        name: 'Ada',
        email: 'ada@example.com',
        image: null
      }
    })

    expect(() => member.assertCanBeRemoved()).toThrow(CannotRemoveOwnerException)
  })
})

describe('Invitation', () => {
  it('wraps status with InvitationStatus value object', () => {
    const invitation = Invitation.fromPersistence({
      id: 'invitation_1',
      email: 'invitee@example.com',
      role: MemberRoleEnum.MEMBER,
      status: 'pending',
      expiresAt: now,
      createdAt: now,
      organizationId: 'org_1',
      inviterId: 'user_1'
    })

    expect(invitation.status).toBeInstanceOf(InvitationStatus)
    expect(invitation.status.isPending()).toBe(true)
  })
})
