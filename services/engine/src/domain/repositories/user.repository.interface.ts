import type { PaginatedResult, UserEntity, UserListParams, UserSessionEntity } from '../entities/user.entity'
import type {
  GetUserAccountsReq,
  GetUserInvitationsReq,
  GetUserMembershipsReq,
  GetUserOrdersReq,
  GetUserSubscriptionsReq
} from '@libs/payload'

export interface AccountEntity {
  readonly id: string
  readonly userId: string
  readonly providerId: string
  readonly accountId: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface UserSubscriptionEntity {
  readonly id: string
  readonly customerId: string
  readonly externalId: string
  readonly variantId: string
  readonly status: string
  readonly store: string
  readonly periodStartsAt: Date
  readonly periodEndsAt: Date
  readonly trialStartsAt: Date | null
  readonly trialEndsAt: Date | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface UserOrderEntity {
  readonly id: string
  readonly customerId: string
  readonly externalId: string
  readonly variantId: string
  readonly status: string
  readonly store: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface UserMembershipEntity {
  readonly id: string
  readonly organizationId: string
  readonly role: string
  readonly createdAt: Date
  readonly userId: string
  readonly organization: {
    readonly id: string
    readonly name: string
    readonly slug: string | null
    readonly logo: string | null
  }
  readonly user: {
    readonly id: string
    readonly name: string
    readonly email: string
  }
}

export interface UserInvitationEntity {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly status: string
  readonly expiresAt: Date
  readonly createdAt: Date
  readonly inviterId: string
  readonly organizationId: string
  readonly organization: {
    readonly id: string
    readonly name: string
    readonly logo: string | null
  }
}

/**
 * 用户仓储接口
 *
 * 领域层定义的抽象接口，由基础设施层实现
 */
export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>

  findByEmail(email: string): Promise<UserEntity | null>

  findMany(params: UserListParams): Promise<PaginatedResult<UserEntity>>

  update(id: string, data: Partial<Pick<UserEntity, 'name' | 'image' | 'role'>>): Promise<UserEntity>

  ban(id: string, reason?: string, expiresAt?: Date): Promise<UserEntity>

  unban(id: string): Promise<UserEntity>

  delete(id: string): Promise<void>

  getSessions(userId: string): Promise<UserSessionEntity[]>

  revokeSession(sessionToken: string): Promise<void>

  revokeAllSessions(userId: string): Promise<void>

  setPassword(userId: string, newPassword: string): Promise<void>

  findAccounts(userId: string, params: GetUserAccountsReq): Promise<{ list: AccountEntity[]; total: number }>

  countAccounts(userId: string): Promise<number>

  deleteAccount(userId: string, accountId: string): Promise<void>

  findSubscriptions(
    userId: string,
    params: GetUserSubscriptionsReq
  ): Promise<{ list: UserSubscriptionEntity[]; total: number }>

  findOrders(userId: string, params: GetUserOrdersReq): Promise<{ list: UserOrderEntity[]; total: number }>

  findMemberships(
    userId: string,
    params: GetUserMembershipsReq
  ): Promise<{ list: UserMembershipEntity[]; total: number }>

  findInvitations(
    userId: string,
    params: GetUserInvitationsReq
  ): Promise<{ list: UserInvitationEntity[]; total: number }>
}

/**
 * 用户仓储注入 Token
 */
export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
