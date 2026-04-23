import { describe, expect, it } from 'vitest'

import {
  BillingOrderStatus,
  BillingSubscriptionStatus,
  InvitationStatus,
  MemberRole,
  UserRole
} from '../../shared/constants'
import {
  banUserReqSchema,
  getUserAccountsReqSchema,
  getUserAccountsResSchema,
  getUserInvitationsReqSchema,
  getUserInvitationsResSchema,
  getUserMembershipsReqSchema,
  getUserMembershipsResSchema,
  getUserOrdersReqSchema,
  getUserOrdersResSchema,
  revokeUserSessionReqSchema,
  setUserPasswordReqSchema,
  getUsersReqSchema,
  getUsersResSchema,
  getUserSubscriptionsReqSchema,
  getUserSubscriptionsResSchema,
  updateAdminUserReqSchema
} from '../users.schema'

const sortQuery = (value: unknown) => encodeURIComponent(JSON.stringify(value))

describe('getUsersReqSchema', () => {
  it('parses a valid request with all fields', () => {
    const raw = {
      page: '2',
      perPage: '20',
      sort: sortQuery([{ id: 'createdAt', desc: true }]),
      q: 'alice',
      role: UserRole.ADMIN,
      twoFactorEnabled: true,
      banned: false,
      createdAt: [0, 1_700_000_000_000] as [number, number]
    }

    const parsed = getUsersReqSchema.parse(raw)

    expect(parsed.page).toBe(2)
    expect(parsed.perPage).toBe(20)
    expect(parsed.sort).toEqual([{ id: 'createdAt', desc: true }])
    expect(parsed.q).toBe('alice')
    expect(parsed.role).toEqual([UserRole.ADMIN])
    expect(parsed.twoFactorEnabled).toEqual([true])
    expect(parsed.banned).toEqual([false])
    expect(parsed.createdAt).toEqual([0, 1_700_000_000_000])
  })

  it('applies default pagination (page 1, perPage 10)', () => {
    const parsed = getUsersReqSchema.parse({})

    expect(parsed.page).toBe(1)
    expect(parsed.perPage).toBe(10)
  })

  it('rejects non-integer page', () => {
    const result = getUsersReqSchema.safeParse({ page: 1.5 })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('page'))).toBe(true)
    }
  })

  it('rejects uncoercible page string', () => {
    const result = getUsersReqSchema.safeParse({ page: 'x' })

    expect(result.success).toBe(false)
  })

  it('allows optional filters to be omitted', () => {
    const parsed = getUsersReqSchema.parse({ page: 1, perPage: 5 })

    expect(parsed.q).toBeUndefined()
    expect(parsed.role).toBeUndefined()
    expect(parsed.sort).toBeUndefined()
  })
})

describe('getUsersResSchema', () => {
  const baseUser = {
    id: 'u1',
    email: 'a@b.c',
    emailVerified: true,
    name: 'A',
    twoFactorEnabled: null,
    isAnonymous: false,
    banned: false,
    role: 'user'
  }

  it('parses a valid response with all fields', () => {
    const iso = '2024-01-15T12:00:00.000Z'
    const parsed = getUsersResSchema.parse({
      list: [
        {
          ...baseUser,
          createdAt: iso,
          updatedAt: iso,
          image: 'https://x/y.png',
          banReason: null,
          banExpires: null
        }
      ],
      total: 1
    })

    expect(parsed.list[0].createdAt).toBeInstanceOf(Date)
    expect(parsed.list[0].updatedAt).toBeInstanceOf(Date)
    expect(parsed.list[0].image).toBe('https://x/y.png')
  })

  it('coerces date strings to Date', () => {
    const parsed = getUsersResSchema.parse({
      list: [
        {
          ...baseUser,
          createdAt: '2020-01-01T00:00:00.000Z',
          updatedAt: '2021-06-01T00:00:00.000Z',
          image: null,
          banReason: undefined,
          banExpires: undefined
        }
      ],
      total: 1
    })

    expect(parsed.list[0].createdAt).toBeInstanceOf(Date)
    expect(parsed.list[0].updatedAt).toBeInstanceOf(Date)
  })

  it('accepts nullish image, banExpires, and banReason', () => {
    const parsed = getUsersResSchema.parse({
      list: [
        {
          ...baseUser,
          createdAt: new Date(),
          updatedAt: new Date(),
          image: null,
          banExpires: null,
          banReason: null
        }
      ],
      total: 1
    })

    expect(parsed.list[0].image).toBeNull()
    expect(parsed.list[0].banExpires).toBeNull()
    expect(parsed.list[0].banReason).toBeNull()
  })

  it('rejects invalid rows', () => {
    const result = getUsersResSchema.safeParse({
      list: [{ ...baseUser, createdAt: 'not-a-date', updatedAt: new Date() }],
      total: 1
    })

    expect(result.success).toBe(false)
  })
})

describe('admin user mutation schemas', () => {
  it('parses update user payload', () => {
    const parsed = updateAdminUserReqSchema.parse({
      name: 'Alice',
      image: 'https://example.com/avatar.png',
      role: UserRole.ADMIN
    })

    expect(parsed.name).toBe('Alice')
    expect(parsed.role).toBe(UserRole.ADMIN)
  })

  it('parses ban payload with coerced date', () => {
    const parsed = banUserReqSchema.parse({
      reason: 'policy violation',
      expiresAt: '2026-01-01T00:00:00.000Z'
    })

    expect(parsed.reason).toBe('policy violation')
    expect(parsed.expiresAt).toBeInstanceOf(Date)
  })

  it('rejects too-short password', () => {
    const result = setUserPasswordReqSchema.safeParse({
      newPassword: 'short'
    })

    expect(result.success).toBe(false)
  })

  it('requires revoke session token', () => {
    const result = revokeUserSessionReqSchema.safeParse({})

    expect(result.success).toBe(false)
  })
})

describe('getUserAccountsReqSchema', () => {
  it('parses minimal and filtered requests', () => {
    expect(getUserAccountsReqSchema.parse({}).page).toBe(1)

    const parsed = getUserAccountsReqSchema.parse({
      providerId: 'google',
      createdAt: [1, 2] as [number, number],
      sort: sortQuery([{ id: 'createdAt' }])
    })

    expect(parsed.providerId).toEqual(['google'])
    expect(parsed.createdAt).toEqual([1, 2])
  })

  it('rejects invalid providerId', () => {
    const result = getUserAccountsReqSchema.safeParse({
      providerId: 'unknown-provider'
    })

    expect(result.success).toBe(false)
  })
})

describe('getUserSubscriptionsReqSchema', () => {
  it('parses basic request and status filter', () => {
    expect(getUserSubscriptionsReqSchema.parse({}).perPage).toBe(10)

    const parsed = getUserSubscriptionsReqSchema.parse({
      status: BillingSubscriptionStatus.ACTIVE
    })

    expect(parsed.status).toEqual([BillingSubscriptionStatus.ACTIVE])
  })
})

describe('getUserOrdersReqSchema', () => {
  it('parses basic request and order filters', () => {
    const parsed = getUserOrdersReqSchema.parse({
      status: BillingOrderStatus.SUCCEEDED,
      store: ['stripe']
    })

    expect(parsed.status).toEqual([BillingOrderStatus.SUCCEEDED])
    expect(parsed.store).toEqual(['stripe'])
  })
})

describe('getUserMembershipsReqSchema', () => {
  it('parses role filter', () => {
    const parsed = getUserMembershipsReqSchema.parse({
      role: MemberRole.ADMIN
    })

    expect(parsed.role).toEqual([MemberRole.ADMIN])
  })
})

describe('getUserInvitationsReqSchema', () => {
  it('parses status and expiresAt range', () => {
    const parsed = getUserInvitationsReqSchema.parse({
      status: InvitationStatus.PENDING,
      expiresAt: [0, 9_999_999_999] as [number, number]
    })

    expect(parsed.status).toEqual([InvitationStatus.PENDING])
    expect(parsed.expiresAt).toEqual([0, 9_999_999_999])
  })
})

describe('getUserAccountsResSchema', () => {
  it('validates list shape and coerces dates', () => {
    const parsed = getUserAccountsResSchema.parse({
      list: [
        {
          id: 'a1',
          userId: 'u1',
          providerId: 'credential',
          accountId: 'x',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z'
        }
      ],
      total: 1
    })

    expect(parsed.list[0].createdAt).toBeInstanceOf(Date)
  })
})

describe('getUserSubscriptionsResSchema', () => {
  it('validates subscription fields', () => {
    const parsed = getUserSubscriptionsResSchema.parse({
      list: [
        {
          id: 's1',
          customerId: 'c1',
          externalId: 'ext',
          variantId: 'v',
          status: 'active',
          store: 'stripe',
          periodStartsAt: new Date(),
          periodEndsAt: new Date(),
          trialStartsAt: null,
          trialEndsAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      total: 1
    })

    expect(parsed.list[0].trialStartsAt).toBeNull()
  })
})

describe('getUserOrdersResSchema', () => {
  it('validates order fields', () => {
    const parsed = getUserOrdersResSchema.parse({
      list: [
        {
          id: 'o1',
          customerId: 'c1',
          externalId: 'ext',
          variantId: 'v',
          status: 'succeeded',
          store: 'stripe',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      total: 1
    })

    expect(parsed.list[0].store).toBe('stripe')
  })
})

describe('getUserMembershipsResSchema', () => {
  it('validates nested organization and user', () => {
    const parsed = getUserMembershipsResSchema.parse({
      list: [
        {
          id: 'm1',
          organizationId: 'o1',
          role: MemberRole.MEMBER,
          createdAt: '2024-01-01T00:00:00.000Z',
          userId: 'u1',
          organization: {
            id: 'o1',
            name: 'Org',
            slug: 'org',
            logo: null
          },
          user: {
            id: 'u1',
            name: 'U',
            email: 'u@x.y'
          }
        }
      ],
      total: 1
    })

    expect(parsed.list[0].organization.name).toBe('Org')
    expect(parsed.list[0].user.email).toBe('u@x.y')
  })

  it('rejects invalid member role', () => {
    const result = getUserMembershipsResSchema.safeParse({
      list: [
        {
          id: 'm1',
          organizationId: 'o1',
          role: 'superadmin',
          createdAt: new Date(),
          userId: 'u1',
          organization: {
            id: 'o1',
            name: 'Org',
            slug: null,
            logo: undefined
          },
          user: { id: 'u1', name: 'U', email: 'u@x.y' }
        }
      ],
      total: 1
    })

    expect(result.success).toBe(false)
  })
})

describe('getUserInvitationsResSchema', () => {
  it('validates nested organization and enums', () => {
    const parsed = getUserInvitationsResSchema.parse({
      list: [
        {
          id: 'i1',
          email: 'inv@x.y',
          role: MemberRole.ADMIN,
          status: InvitationStatus.PENDING,
          expiresAt: '2030-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          inviterId: 'u2',
          organizationId: 'o1',
          organization: {
            id: 'o1',
            name: 'Org',
            logo: undefined
          }
        }
      ],
      total: 1
    })

    expect(parsed.list[0].expiresAt).toBeInstanceOf(Date)
    expect(parsed.list[0].organization.id).toBe('o1')
  })
})
