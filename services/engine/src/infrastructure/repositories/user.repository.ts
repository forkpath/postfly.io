import type { PaginatedResult, UserEntity, UserListParams, UserSessionEntity } from '../../domain/entities/user.entity'
import type { IUserRepository } from '../../domain/repositories/user.repository.interface'

import { Injectable } from '@nestjs/common'

import { auth } from '@libs/auth/server'
import { prisma } from '@libs/pg-dao'

/**
 * 用户仓储实现
 *
 * 使用 Prisma 进行数据查询，结合 Better Auth 进行认证相关操作
 */
@Injectable()
export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id }
    })
    return user ? this.mapToEntity(user) : null
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { email }
    })
    return user ? this.mapToEntity(user) : null
  }

  async findMany(params: UserListParams): Promise<PaginatedResult<UserEntity>> {
    const { page = 1, limit = 20, search, role, banned, sortBy = 'createdAt', sortOrder = 'desc' } = params

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } }
        ]
      }),
      ...(role && { role }),
      ...(banned !== undefined && { banned })
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      }),
      prisma.user.count({ where })
    ])

    return {
      data: users.map(u => this.mapToEntity(u)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  }

  async update(id: string, data: Partial<Pick<UserEntity, 'name' | 'image' | 'role'>>): Promise<UserEntity> {
    const user = await prisma.user.update({
      where: { id },
      data
    })
    return this.mapToEntity(user)
  }

  async ban(id: string, reason?: string, expiresAt?: Date): Promise<UserEntity> {
    // 使用 Better Auth 的 admin API 进行封禁
    await auth.api.banUser({
      body: {
        userId: id,
        banReason: reason,
        banExpiresIn: expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 1000) : undefined
      }
    })
    // 重新获取更新后的用户
    const user = await this.findById(id)
    return user!
  }

  async unban(id: string): Promise<UserEntity> {
    // 使用 Better Auth 的 admin API 进行解封
    await auth.api.unbanUser({
      body: { userId: id }
    })
    const user = await this.findById(id)
    return user!
  }

  async delete(id: string): Promise<void> {
    // 使用 Better Auth 的 admin API 删除用户
    // 这会级联删除所有关联数据（sessions, accounts 等）
    await auth.api.removeUser({
      body: { userId: id }
    })
  }

  async getSessions(userId: string): Promise<UserSessionEntity[]> {
    // 使用 Better Auth 的 admin API 获取用户会话
    const result = await auth.api.listUserSessions({
      body: { userId }
    })
    const sessions = result?.sessions ?? []
    return sessions.map(s => this.mapSessionToEntity(s))
  }

  async revokeSession(sessionToken: string): Promise<void> {
    // 使用 Better Auth 的 admin API 撤销会话
    await auth.api.revokeUserSession({
      body: { sessionToken }
    })
  }

  async revokeAllSessions(userId: string): Promise<void> {
    // 使用 Better Auth 的 admin API 撤销所有会话
    await auth.api.revokeUserSessions({
      body: { userId }
    })
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    // 使用 Better Auth 的 admin API 设置密码
    await auth.api.setUserPassword({
      body: { userId, newPassword }
    })
  }

  /**
   * 将 Prisma 用户映射为领域实体
   */
  private mapToEntity(user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    role: string | null
    banned: boolean | null
    banReason: string | null
    banExpires: Date | null
    createdAt: Date
    updatedAt: Date
  }): UserEntity {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: (user.role ?? 'user') as UserEntity['role'],
      banned: user.banned ?? false,
      banReason: user.banReason,
      banExpires: user.banExpires,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }

  /**
   * 将 Better Auth 会话映射为领域实体
   */
  private mapSessionToEntity(session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    ipAddress?: string | null
    userAgent?: string | null
  }): UserSessionEntity {
    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: new Date(session.expiresAt),
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null
    }
  }
}
