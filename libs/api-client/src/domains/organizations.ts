/**
 * 组织相关的 Query Keys、Query Options 和 Mutations
 *
 * @example
 * ```ts
 * // ========== Keys ==========
 * orgKeys.all                    // ['organizations']
 * orgKeys.detail('org-1')        // ['organizations', 'detail', 'org-1']
 * orgKeys.members('org-1')       // ['organizations', 'detail', 'org-1', 'members']
 *
 * // ========== Queries ==========
 * const api = useApiClient()
 * const { data } = useQuery(orgQueries.detail(api, { id: 'org-1' }))
 * const { data } = useQuery(orgQueries.members(api, { orgId: 'org-1' }))
 *
 * // ========== Mutations ==========
 * const createOrg = useMutation(orgMutations.create.options(api, {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.all })
 * }))
 *
 * const inviteMember = useMutation(orgMutations.inviteMember.options(api, { orgId }, {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) })
 * }))
 * ```
 */

// import {
//   createMutationFactory,
//   createMutationWithParamsFactory,
//   createQueryOptionsWithParams
// } from './factory'

// ==================== Keys ====================

export const orgKeys = {
  all: ['organizations'] as const,
  lists: () => [...orgKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...orgKeys.lists(), filters] as const,
  details: () => [...orgKeys.all, 'detail'] as const,
  detail: (id: string) => [...orgKeys.details(), id] as const,
  members: (orgId: string) => [...orgKeys.detail(orgId), 'members'] as const,
  invitations: (orgId: string) => [...orgKeys.detail(orgId), 'invitations'] as const
} as const

export type OrgKeys = typeof orgKeys

// ==================== Types ====================
// 根据实际 API 响应定义类型

// interface Organization {
//   id: string
//   name: string
//   slug: string
//   logo?: string
//   createdAt: string
// }

// interface Member {
//   id: string
//   userId: string
//   role: 'owner' | 'admin' | 'member'
//   user: { id: string; name: string; email: string }
// }

// interface Invitation {
//   id: string
//   email: string
//   role: string
//   status: 'pending' | 'accepted' | 'rejected'
// }

// interface CreateOrgInput {
//   name: string
//   slug?: string
// }

// interface UpdateOrgInput {
//   name?: string
//   slug?: string
//   logo?: string
// }

// interface InviteMemberInput {
//   email: string
//   role: 'admin' | 'member'
// }

// ==================== Queries（查） ====================

// export const orgQueries = {
//   /** 获取组织详情 */
//   detail: createQueryOptionsWithParams<Organization, Error, Organization, { id: string }>(
//     (api, { id }) => ({
//       queryKey: orgKeys.detail(id),
//       queryFn: () => api.get(`/organizations/${id}`)
//     })
//   ),

//   /** 获取组织列表 */
//   list: createQueryOptionsWithParams<Organization[], Error, Organization[], { filters?: Record<string, unknown> }>(
//     (api, { filters }) => ({
//       queryKey: orgKeys.list(filters),
//       queryFn: () => api.get('/organizations', { params: filters })
//     })
//   ),

//   /** 获取组织成员 */
//   members: createQueryOptionsWithParams<Member[], Error, Member[], { orgId: string }>(
//     (api, { orgId }) => ({
//       queryKey: orgKeys.members(orgId),
//       queryFn: () => api.get(`/organizations/${orgId}/members`)
//     })
//   ),

//   /** 获取待处理邀请 */
//   invitations: createQueryOptionsWithParams<Invitation[], Error, Invitation[], { orgId: string }>(
//     (api, { orgId }) => ({
//       queryKey: orgKeys.invitations(orgId),
//       queryFn: () => api.get(`/organizations/${orgId}/invitations`)
//     })
//   )
// }

// ==================== Mutations（增删改） ====================

// export const orgMutations = {
//   /** 创建组织 */
//   create: createMutationFactory<Organization, Error, CreateOrgInput>(
//     (api, data) => api.post('/organizations', data)
//   ),

//   /** 更新组织 */
//   update: createMutationFactory<Organization, Error, { id: string; data: UpdateOrgInput }>(
//     (api, { id, data }) => api.patch(`/organizations/${id}`, data)
//   ),

//   /** 删除组织 */
//   delete: createMutationFactory<void, Error, { id: string }>(
//     (api, { id }) => api.delete(`/organizations/${id}`)
//   ),

//   /** 邀请成员（需要 orgId 参数） */
//   inviteMember: createMutationWithParamsFactory<Invitation, Error, InviteMemberInput, { orgId: string }>(
//     (api, data, { orgId }) => api.post(`/organizations/${orgId}/invitations`, data)
//   ),

//   /** 移除成员 */
//   removeMember: createMutationWithParamsFactory<void, Error, { memberId: string }, { orgId: string }>(
//     (api, { memberId }, { orgId }) => api.delete(`/organizations/${orgId}/members/${memberId}`)
//   ),

//   /** 更新成员角色 */
//   updateMemberRole: createMutationWithParamsFactory<Member, Error, { memberId: string; role: string }, { orgId: string }>(
//     (api, { memberId, role }, { orgId }) => api.patch(`/organizations/${orgId}/members/${memberId}`, { role })
//   ),

//   /** 取消邀请 */
//   cancelInvitation: createMutationWithParamsFactory<void, Error, { invitationId: string }, { orgId: string }>(
//     (api, { invitationId }, { orgId }) => api.delete(`/organizations/${orgId}/invitations/${invitationId}`)
//   )
// }
