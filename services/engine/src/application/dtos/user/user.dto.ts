import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import {
  banUserReqSchema,
  getUserAccountsReqSchema,
  getUserInvitationsReqSchema,
  getUserMembershipsReqSchema,
  getUserOrdersReqSchema,
  getUsersReqSchema,
  getUserSubscriptionsReqSchema,
  revokeUserSessionReqSchema,
  setUserPasswordReqSchema,
  updateAdminUserReqSchema
} from '@libs/payload'

import { UserRole } from '../../../domain/entities/user.entity'

// ==================== Response DTOs ====================

/**
 * 用户响应 Schema
 */
export const userResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  image: z.string().nullable(),
  twoFactorEnabled: z.boolean().nullable(),
  isAnonymous: z.boolean(),
  role: z.enum([UserRole.USER, UserRole.ADMIN]),
  banned: z.boolean(),
  banReason: z.string().nullable(),
  banExpires: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
})

export type UserResponse = z.infer<typeof userResponseSchema>

/**
 * 用户会话响应 Schema
 */
export const userSessionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable()
})

export type UserSessionResponse = z.infer<typeof userSessionResponseSchema>

// ==================== Request DTOs ====================

export class ListUsersQueryDto extends createZodDto(getUsersReqSchema) {}

export class UpdateUserDto extends createZodDto(updateAdminUserReqSchema) {}

export class BanUserDto extends createZodDto(banUserReqSchema) {}

export class SetUserPasswordDto extends createZodDto(setUserPasswordReqSchema) {}

export class RevokeSessionDto extends createZodDto(revokeUserSessionReqSchema) {}

export class ListUserAccountsQueryDto extends createZodDto(getUserAccountsReqSchema) {}

export class ListUserSubscriptionsQueryDto extends createZodDto(getUserSubscriptionsReqSchema) {}

export class ListUserOrdersQueryDto extends createZodDto(getUserOrdersReqSchema) {}

export class ListUserMembershipsQueryDto extends createZodDto(getUserMembershipsReqSchema) {}

export class ListUserInvitationsQueryDto extends createZodDto(getUserInvitationsReqSchema) {}
