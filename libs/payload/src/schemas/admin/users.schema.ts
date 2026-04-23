import { z } from 'zod'

import {
  BillingOrderStatus,
  BillingSubscriptionStatus,
  InvitationStatus,
  MemberRole,
  SocialProvider,
  UserRole
} from '../shared/constants'
import { offsetPaginationSchema } from '../shared/pagination.schema'
import { multiValueQuerySchema, rangeQuerySchema, sortQuerySchema } from '../shared/query-utils'

// ==================== Users List ====================

export const getUsersReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  q: z.string().optional(),
  role: multiValueQuerySchema(z.enum(UserRole)).optional(),
  twoFactorEnabled: multiValueQuerySchema(z.coerce.boolean()).optional(),
  banned: multiValueQuerySchema(z.coerce.boolean()).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetUsersReq = z.infer<typeof getUsersReqSchema>

export const getUsersResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
      email: z.string(),
      emailVerified: z.boolean(),
      name: z.string(),
      image: z.string().nullish(),
      twoFactorEnabled: z.boolean().nullable(),
      isAnonymous: z.boolean(),
      banned: z.boolean().nullable(),
      role: z.string().nullish(),
      banReason: z.string().nullish(),
      banExpires: z.coerce.date().nullish()
    })
  ),
  total: z.number()
})

export type GetUsersRes = z.infer<typeof getUsersResSchema>

// ==================== Update User ====================

export const updateAdminUserReqSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().nullable().optional(),
  role: z.enum(UserRole).optional()
})

export type UpdateAdminUserReq = z.infer<typeof updateAdminUserReqSchema>

// ==================== Ban User ====================

export const banUserReqSchema = z.object({
  reason: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional()
})

export type BanUserReq = z.infer<typeof banUserReqSchema>

// ==================== Set Password ====================

export const setUserPasswordReqSchema = z.object({
  newPassword: z.string().min(8).max(100)
})

export type SetUserPasswordReq = z.infer<typeof setUserPasswordReqSchema>

// ==================== Revoke Session ====================

export const revokeUserSessionReqSchema = z.object({
  token: z.string()
})

export type RevokeUserSessionReq = z.infer<typeof revokeUserSessionReqSchema>

// ==================== User Accounts ====================

export const getUserAccountsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  providerId: multiValueQuerySchema(
    z.enum(['credential', ...Object.values(SocialProvider)] as [string, ...string[]])
  ).optional(),
  createdAt: rangeQuerySchema.optional(),
  updatedAt: rangeQuerySchema.optional()
})

export type GetUserAccountsReq = z.infer<typeof getUserAccountsReqSchema>

export const getUserAccountsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      userId: z.string(),
      providerId: z.string(),
      accountId: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date()
    })
  ),
  total: z.number()
})

export type GetUserAccountsRes = z.infer<typeof getUserAccountsResSchema>

// ==================== User Subscriptions ====================

export const getUserSubscriptionsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  status: multiValueQuerySchema(z.enum(BillingSubscriptionStatus)).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetUserSubscriptionsReq = z.infer<typeof getUserSubscriptionsReqSchema>

export const getUserSubscriptionsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      customerId: z.string(),
      externalId: z.string(),
      variantId: z.string(),
      status: z.string(),
      store: z.string(),
      periodStartsAt: z.coerce.date(),
      periodEndsAt: z.coerce.date(),
      trialStartsAt: z.coerce.date().nullable(),
      trialEndsAt: z.coerce.date().nullable(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date()
    })
  ),
  total: z.number()
})

export type GetUserSubscriptionsRes = z.infer<typeof getUserSubscriptionsResSchema>

// ==================== User Orders ====================

export const getUserOrdersReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  status: multiValueQuerySchema(z.enum(BillingOrderStatus)).optional(),
  store: multiValueQuerySchema(z.string()).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetUserOrdersReq = z.infer<typeof getUserOrdersReqSchema>

export const getUserOrdersResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      customerId: z.string(),
      externalId: z.string(),
      variantId: z.string(),
      status: z.string(),
      store: z.string(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date()
    })
  ),
  total: z.number()
})

export type GetUserOrdersRes = z.infer<typeof getUserOrdersResSchema>

// ==================== User Memberships ====================

export const getUserMembershipsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  createdAt: rangeQuerySchema.optional()
})

export type GetUserMembershipsReq = z.infer<typeof getUserMembershipsReqSchema>

export const getUserMembershipsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      organizationId: z.string(),
      role: z.enum(MemberRole),
      createdAt: z.coerce.date(),
      userId: z.string(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
        slug: z.string().nullish(),
        logo: z.string().nullish()
      }),
      user: z.object({
        id: z.string(),
        name: z.string(),
        email: z.string()
      })
    })
  ),
  total: z.number()
})

export type GetUserMembershipsRes = z.infer<typeof getUserMembershipsResSchema>

// ==================== User Invitations ====================

export const getUserInvitationsReqSchema = offsetPaginationSchema.extend({
  sort: sortQuerySchema.optional(),
  role: multiValueQuerySchema(z.enum(MemberRole)).optional(),
  status: multiValueQuerySchema(z.enum(InvitationStatus)).optional(),
  expiresAt: rangeQuerySchema.optional()
})

export type GetUserInvitationsReq = z.infer<typeof getUserInvitationsReqSchema>

export const getUserInvitationsResSchema = z.object({
  list: z.array(
    z.object({
      id: z.string(),
      email: z.string(),
      role: z.enum(MemberRole),
      status: z.enum(InvitationStatus),
      expiresAt: z.coerce.date(),
      createdAt: z.coerce.date(),
      inviterId: z.string(),
      organizationId: z.string(),
      organization: z.object({
        id: z.string(),
        name: z.string(),
        logo: z.string().nullish()
      })
    })
  ),
  total: z.number()
})

export type GetUserInvitationsRes = z.infer<typeof getUserInvitationsResSchema>
