/**
 * 用户实体
 *
 * 领域层核心实体，不依赖任何外部框架
 */
export interface UserEntity {
  /** 用户唯一标识 */
  readonly id: string
  /** 用户名 */
  readonly name: string
  /** 邮箱地址 */
  readonly email: string
  /** 邮箱是否已验证 */
  readonly emailVerified: boolean
  /** 头像 URL */
  readonly image: string | null
  /** 是否启用双重认证 */
  readonly twoFactorEnabled: boolean | null
  /** 是否匿名用户 */
  readonly isAnonymous: boolean
  /** 用户角色 */
  readonly role: UserRole
  /** 是否被封禁 */
  readonly banned: boolean
  /** 封禁原因 */
  readonly banReason: string | null
  /** 封禁过期时间 */
  readonly banExpires: Date | null
  /** 创建时间 */
  readonly createdAt: Date
  /** 更新时间 */
  readonly updatedAt: Date
}

/**
 * 用户角色
 */
export const UserRole = {
  USER: 'user',
  ADMIN: 'admin'
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

/**
 * 用户会话实体
 */
export interface UserSessionEntity {
  readonly id: string
  readonly userId: string
  readonly token: string
  readonly expiresAt: Date
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly ipAddress: string | null
  readonly userAgent: string | null
}
