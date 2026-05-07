import type { GetUsersRes } from '@libs/payload'

import { createZodDto } from 'nestjs-zod'

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

export type UserResponse = GetUsersRes['list'][number]

export interface UserSessionResponse {
  readonly id: string
  readonly userId: string
  readonly token: string
  readonly expiresAt: Date
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly ipAddress: string | null
  readonly userAgent: string | null
}

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
