import { describe, expect, it } from 'vitest'

import { InvitationStatus, MemberRole } from '../../shared/constants'
import {
  getInvitationsReqSchema,
  getInvitationsResSchema,
  getMembersReqSchema,
  getMembersResSchema,
  getOrganizationResSchema,
  getOrganizationsReqSchema,
  getOrganizationsResSchema,
  updateMemberSchema,
  updateOrganizationSchema
} from '../organizations.schema'

const sortQuery = (value: unknown) => encodeURIComponent(JSON.stringify(value))

describe('getOrganizationsReqSchema', () => {
  it('parses a valid request', () => {
    const parsed = getOrganizationsReqSchema.parse({
      page: 3,
      perPage: 25,
      q: 'acme',
      sort: sortQuery([{ id: 'name', desc: false }]),
      createdAt: [0, 1] as [number, number],
      members: [1, 100] as [number, number]
    })

    expect(parsed.page).toBe(3)
    expect(parsed.perPage).toBe(25)
    expect(parsed.q).toBe('acme')
    expect(parsed.members).toEqual([1, 100])
  })

  it('applies default pagination', () => {
    const parsed = getOrganizationsReqSchema.parse({})

    expect(parsed.page).toBe(1)
    expect(parsed.perPage).toBe(10)
  })
})

describe('getOrganizationsResSchema', () => {
  it('parses list with per-row members and max aggregation', () => {
    const parsed = getOrganizationsResSchema.parse({
      list: [
        {
          id: 'o1',
          name: 'A',
          slug: 'a',
          logo: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          members: 42
        },
        {
          id: 'o2',
          name: 'B',
          slug: null,
          logo: undefined,
          createdAt: new Date(),
          members: 3
        }
      ],
      total: 2,
      max: { members: 100 }
    })

    expect(parsed.list[0].members).toBe(42)
    expect(parsed.max.members).toBe(100)
    expect(parsed.list[1].createdAt).toBeInstanceOf(Date)
  })
})

describe('getOrganizationResSchema', () => {
  it('parses organization detail', () => {
    const parsed = getOrganizationResSchema.parse({
      id: 'o1',
      name: 'Org',
      slug: 'org',
      logo: 'https://x/l.png',
      createdAt: '2022-06-01T00:00:00.000Z'
    })

    expect(parsed?.slug).toBe('org')
    expect(parsed?.createdAt).toBeInstanceOf(Date)
  })

  it('allows null response', () => {
    expect(getOrganizationResSchema.parse(null)).toBeNull()
  })
})

describe('getMembersReqSchema', () => {
  it('parses basic member list query', () => {
    const parsed = getMembersReqSchema.parse({
      role: MemberRole.OWNER,
      q: 'bob'
    })

    expect(parsed.role).toEqual([MemberRole.OWNER])
    expect(parsed.q).toBe('bob')
  })
})

describe('getInvitationsReqSchema', () => {
  it('parses invitation filters', () => {
    const parsed = getInvitationsReqSchema.parse({
      email: 'x@y.z',
      status: InvitationStatus.CANCELED
    })

    expect(parsed.email).toBe('x@y.z')
    expect(parsed.status).toEqual([InvitationStatus.CANCELED])
  })
})

describe('getMembersResSchema', () => {
  it('parses nested user object', () => {
    const parsed = getMembersResSchema.parse({
      list: [
        {
          id: 'm1',
          organizationId: 'o1',
          role: MemberRole.ADMIN,
          createdAt: '2024-05-01T00:00:00.000Z',
          userId: 'u1',
          user: {
            id: 'u1',
            name: 'Bob',
            email: 'bob@x.y',
            image: null
          }
        }
      ],
      total: 1
    })

    expect(parsed.list[0].user.email).toBe('bob@x.y')
    expect(parsed.list[0].createdAt).toBeInstanceOf(Date)
  })

  it('rejects malformed nested user', () => {
    const result = getMembersResSchema.safeParse({
      list: [
        {
          id: 'm1',
          organizationId: 'o1',
          role: MemberRole.MEMBER,
          createdAt: new Date(),
          userId: 'u1',
          user: { id: 'u1', name: 'N', email: 123 }
        }
      ],
      total: 1
    })

    expect(result.success).toBe(false)
  })
})

describe('getInvitationsResSchema', () => {
  it('parses invitation rows', () => {
    const parsed = getInvitationsResSchema.parse({
      list: [
        {
          id: 'i1',
          organizationId: 'o1',
          email: 'e@x.y',
          role: MemberRole.MEMBER,
          expiresAt: '2030-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          inviterId: 'u9',
          status: InvitationStatus.PENDING
        }
      ],
      total: 1
    })

    expect(parsed.list[0].status).toBe(InvitationStatus.PENDING)
    expect(parsed.list[0].expiresAt).toBeInstanceOf(Date)
  })
})

describe('updateOrganizationSchema', () => {
  it('accepts valid slug patterns', () => {
    expect(updateOrganizationSchema.parse({ slug: 'acme' }).slug).toBe('acme')
    expect(updateOrganizationSchema.parse({ slug: 'acme-corp' }).slug).toBe('acme-corp')
    expect(updateOrganizationSchema.parse({ slug: 'a1b2' }).slug).toBe('a1b2')
  })

  it('rejects invalid slug (uppercase)', () => {
    const result = updateOrganizationSchema.safeParse({ slug: 'Acme' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Slug must be')
    }
  })

  it('rejects invalid slug (spaces)', () => {
    expect(updateOrganizationSchema.safeParse({ slug: 'ac me' }).success).toBe(false)
  })

  it('allows empty payload', () => {
    expect(updateOrganizationSchema.parse({})).toEqual({})
  })
})

describe('updateMemberSchema', () => {
  it('accepts valid role', () => {
    expect(updateMemberSchema.parse({ role: MemberRole.ADMIN }).role).toBe(MemberRole.ADMIN)
  })

  it('rejects invalid role', () => {
    const result = updateMemberSchema.safeParse({ role: 'guest' })

    expect(result.success).toBe(false)
  })
})
