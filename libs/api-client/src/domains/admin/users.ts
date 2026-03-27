/**
 * 管理员用户管理 - Query Keys、Query Options 和 Mutations
 *
 * 用于管理后台的用户管理功能，跨平台复用（Web/Desktop/Mobile）
 *
 * @example
 * ```ts
 * // ========== Keys ==========
 * adminUserKeys.all                    // ['admin', 'users']
 * adminUserKeys.list({ page: 1 })      // ['admin', 'users', 'list', { page: 1 }]
 * adminUserKeys.detail('user-123')     // ['admin', 'users', 'detail', 'user-123']
 * adminUserKeys.sessions('user-123')   // ['admin', 'users', 'detail', 'user-123', 'sessions']
 *
 * // ========== Queries ==========
 * const api = useApiClient()
 * const { data } = useQuery(adminUserQueries.list(api, { page: 1 }))
 * const { data } = useQuery(adminUserQueries.detail(api, { id: 'user-123' }))
 *
 * // ========== Mutations ==========
 * const updateMutation = useMutation(adminUserMutations.update.options(api))
 * updateMutation.mutate({ id: 'user-123', data: { name: 'New Name' } })
 *
 * const banMutation = useMutation(adminUserMutations.ban.options(api))
 * banMutation.mutate({ id: 'user-123', reason: 'Violation' })
 * ```
 */
import type {
  GetUserAccountsRes,
  GetUserInvitationsRes,
  GetUserMembershipsRes,
  GetUserOrdersRes,
  GetUsersRes,
  GetUserSubscriptionsRes
} from '@libs/payload'

import { createMutationFactory, createQueryOptionsWithParams } from '../../lib/queries/factory'

// ==================== Types ====================

export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: 'user' | 'admin'
  banned: boolean
  banReason: string | null
  banExpires: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminUserSession {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  ipAddress: string | null
  userAgent: string | null
}

export interface AdminUserListParams {
  page?: number
  limit?: number
  search?: string
  role?: 'user' | 'admin'
  banned?: boolean
  sortBy?: 'createdAt' | 'updatedAt' | 'name' | 'email'
  sortOrder?: 'asc' | 'desc'
}

export interface UpdateAdminUserInput {
  name?: string
  image?: string | null
  role?: 'user' | 'admin'
}

export interface BanUserInput {
  reason?: string
  expiresAt?: string
}

export interface SetPasswordInput {
  newPassword: string
}

// ==================== Keys ====================

export const adminUserKeys = {
  all: ['admin', 'users'] as const,
  lists: () => [...adminUserKeys.all, 'list'] as const,
  list: (params?: Record<string, unknown>) => [...adminUserKeys.lists(), params] as const,
  details: () => [...adminUserKeys.all, 'detail'] as const,
  detail: (id: string) => [...adminUserKeys.details(), id] as const,
  sessions: (userId: string) => [...adminUserKeys.detail(userId), 'sessions'] as const,
  accounts: (userId: string) => [...adminUserKeys.detail(userId), 'accounts'] as const,
  subscriptions: (userId: string) => [...adminUserKeys.detail(userId), 'subscriptions'] as const,
  orders: (userId: string) => [...adminUserKeys.detail(userId), 'orders'] as const,
  memberships: (userId: string) => [...adminUserKeys.detail(userId), 'memberships'] as const,
  invitations: (userId: string) => [...adminUserKeys.detail(userId), 'invitations'] as const
} as const

export type AdminUserKeys = typeof adminUserKeys

// ==================== Queries ====================

export const adminUserQueries = {
  list: createQueryOptionsWithParams<GetUsersRes, Error, GetUsersRes, Record<string, unknown> | undefined>(
    (api, params) => ({
      queryKey: adminUserKeys.list(params),
      queryFn: () => api.get('/admin/users', { params })
    })
  ),

  detail: createQueryOptionsWithParams<AdminUser, Error, AdminUser, { id: string }>((api, { id }) => ({
    queryKey: adminUserKeys.detail(id),
    queryFn: () => api.get(`/admin/users/${id}`)
  })),

  sessions: createQueryOptionsWithParams<AdminUserSession[], Error, AdminUserSession[], { userId: string }>(
    (api, { userId }) => ({
      queryKey: adminUserKeys.sessions(userId),
      queryFn: () => api.get(`/admin/users/${userId}/sessions`)
    })
  ),

  accounts: createQueryOptionsWithParams<
    GetUserAccountsRes,
    Error,
    GetUserAccountsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.accounts(id),
    queryFn: () => api.get(`/admin/users/${id}/accounts`, { params })
  })),

  subscriptions: createQueryOptionsWithParams<
    GetUserSubscriptionsRes,
    Error,
    GetUserSubscriptionsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.subscriptions(id),
    queryFn: () => api.get(`/admin/users/${id}/subscriptions`, { params })
  })),

  orders: createQueryOptionsWithParams<
    GetUserOrdersRes,
    Error,
    GetUserOrdersRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.orders(id),
    queryFn: () => api.get(`/admin/users/${id}/orders`, { params })
  })),

  memberships: createQueryOptionsWithParams<
    GetUserMembershipsRes,
    Error,
    GetUserMembershipsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.memberships(id),
    queryFn: () => api.get(`/admin/users/${id}/memberships`, { params })
  })),

  invitations: createQueryOptionsWithParams<
    GetUserInvitationsRes,
    Error,
    GetUserInvitationsRes,
    { id: string } & Record<string, unknown>
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.invitations(id),
    queryFn: () => api.get(`/admin/users/${id}/invitations`, { params })
  }))
}

// ==================== Mutations ====================

export const adminUserMutations = {
  /** 更新用户 */
  update: createMutationFactory<AdminUser, Error, { id: string; data: UpdateAdminUserInput }>((api, { id, data }) =>
    api.patch(`/admin/users/${id}`, data)
  ),

  /** 删除用户 */
  delete: createMutationFactory<void, Error, { id: string }>((api, { id }) => api.delete(`/admin/users/${id}`)),

  /** 封禁用户 */
  ban: createMutationFactory<AdminUser, Error, { id: string; reason?: string; expiresAt?: string }>(
    (api, { id, ...data }) => api.post(`/admin/users/${id}/ban`, data)
  ),

  /** 解封用户 */
  unban: createMutationFactory<AdminUser, Error, { id: string }>((api, { id }) => api.post(`/admin/users/${id}/unban`)),

  /** 设置用户密码 */
  setPassword: createMutationFactory<void, Error, { id: string; newPassword: string }>((api, { id, newPassword }) =>
    api.post(`/admin/users/${id}/password`, { newPassword })
  ),

  /** 撤销单个会话 */
  revokeSession: createMutationFactory<void, Error, { userId: string; token: string }>((api, { userId, token }) =>
    api.delete(`/admin/users/${userId}/sessions`, { data: { token } })
  ),

  revokeAllSessions: createMutationFactory<void, Error, { userId: string }>((api, { userId }) =>
    api.delete(`/admin/users/${userId}/sessions/all`)
  ),

  deleteAccount: createMutationFactory<void, Error, { userId: string; accountId: string }>(
    (api, { userId, accountId }) => api.delete(`/admin/users/${userId}/accounts/${accountId}`)
  )
}
