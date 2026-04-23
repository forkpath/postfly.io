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
  BanUserReq,
  GetUserAccountsReq,
  GetUserAccountsRes,
  GetUserInvitationsReq,
  GetUserInvitationsRes,
  GetUserMembershipsReq,
  GetUserMembershipsRes,
  GetUserOrdersReq,
  GetUserOrdersRes,
  GetUsersReq,
  GetUsersRes,
  GetUserSubscriptionsReq,
  GetUserSubscriptionsRes,
  RevokeUserSessionReq,
  UpdateAdminUserReq
} from '@libs/payload'

import { createMutationFactory, createQueryOptionsWithParams } from '../../lib/queries/factory'

// ==================== Types ====================

export interface AdminUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  twoFactorEnabled: boolean | null
  isAnonymous: boolean
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
  page?: GetUsersReq['page']
  perPage?: GetUsersReq['perPage']
  q?: GetUsersReq['q']
  role?: GetUsersReq['role']
  twoFactorEnabled?: GetUsersReq['twoFactorEnabled']
  banned?: GetUsersReq['banned']
  createdAt?: GetUsersReq['createdAt']
  sort?: GetUsersReq['sort']
}

type AdminUserAccountsParams = { id: string } & GetUserAccountsReq
type AdminUserSubscriptionsParams = { id: string } & GetUserSubscriptionsReq
type AdminUserOrdersParams = { id: string } & GetUserOrdersReq
type AdminUserMembershipsParams = { id: string } & GetUserMembershipsReq
type AdminUserInvitationsParams = { id: string } & GetUserInvitationsReq

function serializeSort(sort?: { id: string; desc?: boolean }[]) {
  return sort?.length ? encodeURIComponent(JSON.stringify(sort)) : undefined
}

function serializeQueryParams<T extends object | undefined>(params: T) {
  if (!params) {
    return params
  }

  const rawParams = params as Record<string, unknown>

  return {
    ...rawParams,
    sort: Array.isArray(rawParams['sort'])
      ? serializeSort(rawParams['sort'] as { id: string; desc?: boolean }[])
      : rawParams['sort']
  }
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
  list: createQueryOptionsWithParams<GetUsersRes, Error, GetUsersRes, AdminUserListParams | undefined>(
    (api, params) => ({
      queryKey: adminUserKeys.list(params ? ({ ...params } as Record<string, unknown>) : undefined),
      queryFn: () => api.get('/admin/users', { params: serializeQueryParams(params) })
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

  accounts: createQueryOptionsWithParams<GetUserAccountsRes, Error, GetUserAccountsRes, AdminUserAccountsParams>(
    (api, { id, ...params }) => ({
      queryKey: adminUserKeys.accounts(id),
      queryFn: () => api.get(`/admin/users/${id}/accounts`, { params: serializeQueryParams(params) })
    })
  ),

  subscriptions: createQueryOptionsWithParams<
    GetUserSubscriptionsRes,
    Error,
    GetUserSubscriptionsRes,
    AdminUserSubscriptionsParams
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.subscriptions(id),
    queryFn: () => api.get(`/admin/users/${id}/subscriptions`, { params: serializeQueryParams(params) })
  })),

  orders: createQueryOptionsWithParams<GetUserOrdersRes, Error, GetUserOrdersRes, AdminUserOrdersParams>(
    (api, { id, ...params }) => ({
      queryKey: adminUserKeys.orders(id),
      queryFn: () => api.get(`/admin/users/${id}/orders`, { params: serializeQueryParams(params) })
    })
  ),

  memberships: createQueryOptionsWithParams<
    GetUserMembershipsRes,
    Error,
    GetUserMembershipsRes,
    AdminUserMembershipsParams
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.memberships(id),
    queryFn: () => api.get(`/admin/users/${id}/memberships`, { params: serializeQueryParams(params) })
  })),

  invitations: createQueryOptionsWithParams<
    GetUserInvitationsRes,
    Error,
    GetUserInvitationsRes,
    AdminUserInvitationsParams
  >((api, { id, ...params }) => ({
    queryKey: adminUserKeys.invitations(id),
    queryFn: () => api.get(`/admin/users/${id}/invitations`, { params: serializeQueryParams(params) })
  }))
}

// ==================== Mutations ====================

export const adminUserMutations = {
  /** 更新用户 */
  update: createMutationFactory<AdminUser, Error, { id: string; data: UpdateAdminUserReq }>((api, { id, data }) =>
    api.patch(`/admin/users/${id}`, data)
  ),

  /** 删除用户 */
  delete: createMutationFactory<void, Error, { id: string }>((api, { id }) => api.delete(`/admin/users/${id}`)),

  /** 封禁用户 */
  ban: createMutationFactory<AdminUser, Error, { id: string } & BanUserReq>((api, { id, ...data }) =>
    api.post(`/admin/users/${id}/ban`, data)
  ),

  /** 解封用户 */
  unban: createMutationFactory<AdminUser, Error, { id: string }>((api, { id }) => api.post(`/admin/users/${id}/unban`)),

  /** 设置用户密码 */
  setPassword: createMutationFactory<void, Error, { id: string; newPassword: string }>((api, { id, newPassword }) =>
    api.post(`/admin/users/${id}/password`, { newPassword })
  ),

  /** 撤销单个会话 */
  revokeSession: createMutationFactory<void, Error, { userId: string } & RevokeUserSessionReq>(
    (api, { userId, token }) => api.delete(`/admin/users/${userId}/sessions`, { data: { token } })
  ),

  revokeAllSessions: createMutationFactory<void, Error, { userId: string }>((api, { userId }) =>
    api.delete(`/admin/users/${userId}/sessions/all`)
  ),

  deleteAccount: createMutationFactory<void, Error, { userId: string; accountId: string }>(
    (api, { userId, accountId }) => api.delete(`/admin/users/${userId}/accounts/${accountId}`)
  )
}
