import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

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

/**
 * 分页用户列表响应 Schema
 */
export const paginatedUsersResponseSchema = z.object({
  list: z.array(userResponseSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number()
})

export type PaginatedUsersResponse = z.infer<typeof paginatedUsersResponseSchema>

// ==================== Request DTOs ====================

/**
 * 用户列表查询参数 Schema
 */
export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum([UserRole.USER, UserRole.ADMIN]).optional(),
  banned: z
    .string()
    .transform(v => v === 'true')
    .optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export class ListUsersQueryDto extends createZodDto(listUsersQuerySchema) {}

/**
 * 更新用户 Schema
 */
export const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().nullable().optional(),
  role: z.enum([UserRole.USER, UserRole.ADMIN]).optional()
})

export class UpdateUserDto extends createZodDto(updateUserSchema) {}

/**
 * 封禁用户 Schema
 */
export const banUserSchema = z.object({
  reason: z.string().max(500).optional(),
  expiresAt: z.coerce.date().optional()
})

export class BanUserDto extends createZodDto(banUserSchema) {}

/**
 * 设置用户密码 Schema
 */
export const setUserPasswordSchema = z.object({
  newPassword: z.string().min(8).max(100)
})

export class SetUserPasswordDto extends createZodDto(setUserPasswordSchema) {}

/**
 * 撤销会话 Schema
 */
export const revokeSessionSchema = z.object({
  token: z.string()
})

export class RevokeSessionDto extends createZodDto(revokeSessionSchema) {}
