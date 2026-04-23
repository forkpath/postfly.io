import type { UserEntity, UserSessionEntity } from '../../domain/entities/user.entity'
import type {
  AccountEntity,
  IUserRepository,
  UserInvitationEntity,
  UserMembershipEntity,
  UserOrderEntity,
  UserSubscriptionEntity
} from '../../domain/repositories/user.repository.interface'
import type {
  GetUserAccountsReq,
  GetUserInvitationsReq,
  GetUserMembershipsReq,
  GetUserOrdersReq,
  GetUsersReq,
  GetUsersRes,
  GetUserSubscriptionsReq
} from '@libs/payload'

import { Injectable, InternalServerErrorException } from '@nestjs/common'

import { auth } from '@libs/auth/server'
import { Prisma, prisma } from '@libs/pg-dao'

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

  async findMany(params: GetUsersReq): Promise<GetUsersRes> {
    const { page: rawPage = 1, perPage: rawPerPage = 10, q, role, twoFactorEnabled, banned, createdAt, sort } = params
    const page = Number(rawPage)
    const perPage = Number(rawPerPage)

    const where: Prisma.UserWhereInput = {
      AND: [
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' as const } },
                  { email: { contains: q, mode: 'insensitive' as const } }
                ]
              }
            ]
          : []),
        ...(role?.length ? [{ role: { in: role } }] : []),
        ...(twoFactorEnabled?.length ? [{ OR: twoFactorEnabled.map(value => ({ twoFactorEnabled: value })) }] : []),
        ...(banned?.length ? [{ OR: banned.map(value => ({ banned: value })) }] : []),
        ...(createdAt
          ? [
              {
                createdAt: {
                  gte: new Date(createdAt[0]),
                  lte: new Date(createdAt[1])
                }
              }
            ]
          : [])
      ]
    }

    const orderBy = sort?.length
      ? sort.map(item => ({ [item.id]: item.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy
      }),
      prisma.user.count({ where })
    ])

    return {
      list: users.map(u => this.mapToEntity(u)),
      total
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
    if (!user) {
      throw new InternalServerErrorException('User not found after ban operation')
    }
    return user
  }

  async unban(id: string): Promise<UserEntity> {
    // 使用 Better Auth 的 admin API 进行解封
    await auth.api.unbanUser({
      body: { userId: id }
    })
    const user = await this.findById(id)
    if (!user) {
      throw new InternalServerErrorException('User not found after unban operation')
    }
    return user
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

  async findAccounts(userId: string, params: GetUserAccountsReq): Promise<{ list: AccountEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, providerId, createdAt, updatedAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = { userId }
    if (providerId) where.providerId = { in: providerId }
    if (createdAt) {
      where.createdAt = {
        gte: new Date(createdAt[0]),
        lte: new Date(createdAt[1])
      }
    }
    if (updatedAt) {
      where.updatedAt = {
        gte: new Date(updatedAt[0]),
        lte: new Date(updatedAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.account.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy
      }),
      prisma.account.count({ where })
    ])

    return {
      list: data.map(a => ({
        id: a.id,
        userId: a.userId,
        providerId: a.providerId,
        accountId: a.accountId,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      })),
      total
    }
  }

  async countAccounts(userId: string): Promise<number> {
    return prisma.account.count({ where: { userId } })
  }

  async deleteAccount(userId: string, accountId: string): Promise<void> {
    await prisma.account.delete({
      where: { id: accountId, userId }
    })
  }

  async findSubscriptions(
    userId: string,
    params: GetUserSubscriptionsReq
  ): Promise<{ list: UserSubscriptionEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, status, createdAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = {
      customer: { referenceId: userId }
    }
    if (status) where.status = { in: status }
    if (createdAt) {
      where.createdAt = {
        gte: new Date(createdAt[0]),
        lte: new Date(createdAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy
      }),
      prisma.subscription.count({ where })
    ])

    return {
      list: data.map(s => ({
        id: s.id,
        customerId: s.customerId,
        externalId: s.externalId,
        variantId: s.variantId,
        status: s.status,
        store: s.store,
        periodStartsAt: s.periodStartsAt,
        periodEndsAt: s.periodEndsAt,
        trialStartsAt: s.trialStartsAt,
        trialEndsAt: s.trialEndsAt,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      total
    }
  }

  async findOrders(userId: string, params: GetUserOrdersReq): Promise<{ list: UserOrderEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, status, createdAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = {
      customer: { referenceId: userId }
    }
    if (status) where.status = { in: status }
    if (createdAt) {
      where.createdAt = {
        gte: new Date(createdAt[0]),
        lte: new Date(createdAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy
      }),
      prisma.order.count({ where })
    ])

    return {
      list: data.map(o => ({
        id: o.id,
        customerId: o.customerId,
        externalId: o.externalId,
        variantId: o.variantId,
        status: o.status,
        store: o.store,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt
      })),
      total
    }
  }

  async findMemberships(
    userId: string,
    params: GetUserMembershipsReq
  ): Promise<{ list: UserMembershipEntity[]; total: number }> {
    const { page: rp = 1, perPage: rpp = 10, sort, role, createdAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = { userId }
    if (role) where.role = { in: role }
    if (createdAt) {
      where.createdAt = {
        gte: new Date(createdAt[0]),
        lte: new Date(createdAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy,
        include: {
          organization: { select: { id: true, name: true, slug: true, logo: true } },
          user: { select: { id: true, name: true, email: true } }
        }
      }),
      prisma.member.count({ where })
    ])

    return {
      list: data.map(m => ({
        id: m.id,
        organizationId: m.organizationId,
        role: m.role,
        createdAt: m.createdAt,
        userId: m.userId,
        organization: {
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug ?? null,
          logo: m.organization.logo ?? null
        },
        user: {
          id: m.user.id,
          name: m.user.name,
          email: m.user.email
        }
      })),
      total
    }
  }

  async findInvitations(
    userId: string,
    params: GetUserInvitationsReq
  ): Promise<{ list: UserInvitationEntity[]; total: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    if (!user) return { list: [], total: 0 }

    const { page: rp = 1, perPage: rpp = 10, sort, role, status, expiresAt } = params
    const page = Number(rp)
    const perPage = Number(rpp)

    const where: Record<string, unknown> = { email: user.email }
    if (role) where.role = { in: role }
    if (status) where.status = { in: status }
    if (expiresAt) {
      where.expiresAt = {
        gte: new Date(expiresAt[0]),
        lte: new Date(expiresAt[1])
      }
    }

    const orderBy = sort?.length
      ? sort.map(s => ({ [s.id]: s.desc ? 'desc' : 'asc' }))
      : [{ createdAt: 'desc' as const }]

    const [data, total] = await Promise.all([
      prisma.invitation.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy,
        include: {
          organization: { select: { id: true, name: true, logo: true } }
        }
      }),
      prisma.invitation.count({ where })
    ])

    return {
      list: data.map(i => ({
        id: i.id,
        email: i.email,
        role: i.role ?? 'member',
        status: i.status,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        inviterId: i.inviterId,
        organizationId: i.organizationId,
        organization: {
          id: i.organization.id,
          name: i.organization.name,
          logo: i.organization.logo ?? null
        }
      })),
      total
    }
  }

  private mapToEntity(user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
    twoFactorEnabled: boolean | null
    isAnonymous: boolean | null
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
      twoFactorEnabled: user.twoFactorEnabled,
      isAnonymous: user.isAnonymous ?? false,
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
