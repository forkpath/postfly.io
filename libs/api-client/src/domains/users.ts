/**
 * 用户相关的 Query Keys、Query Options 和 Mutations
 *
 * @example
 * ```ts
 * // ========== Keys ==========
 * userKeys.all              // ['users']
 * userKeys.profile()        // ['users', 'profile']
 * userKeys.detail('123')    // ['users', 'detail', '123']
 *
 * // ========== Queries ==========
 * const api = useApiClient()
 * const { data } = useQuery(userQueries.profile(api))
 * const { data } = useQuery(userQueries.detail(api, { id: '123' }))
 *
 * // ========== Mutations ==========
 * const mutation = useMutation(userMutations.update.options(api, {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.profile() })
 * }))
 * mutation.mutate({ name: 'New Name' })
 * ```
 */

// import {
//   createMutationFactory,
//   createQueryOptionsFactory,
//   createQueryOptionsWithParams
// } from './factory'

// ==================== Keys ====================

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  profile: () => [...userKeys.all, 'profile'] as const
} as const

export type UserKeys = typeof userKeys

// ==================== Types ====================
// 根据实际 API 响应定义类型

// interface User {
//   id: string
//   email: string
//   name?: string
//   avatar?: string
//   createdAt: string
// }

// interface CreateUserInput {
//   email: string
//   name?: string
// }

// interface UpdateUserInput {
//   name?: string
//   avatar?: string
// }

// ==================== Queries（查） ====================

// export const userQueries = {
//   /** 获取当前用户信息 */
//   profile: createQueryOptionsFactory<User>(api => ({
//     queryKey: userKeys.profile(),
//     queryFn: () => api.get('/users/profile')
//   })),

//   /** 获取用户详情 */
//   detail: createQueryOptionsWithParams<User, Error, User, { id: string }>((api, { id }) => ({
//     queryKey: userKeys.detail(id),
//     queryFn: () => api.get(`/users/${id}`)
//   })),

//   /** 获取用户列表 */
//   list: createQueryOptionsWithParams<User[], Error, User[], { filters?: Record<string, unknown> }>(
//     (api, { filters }) => ({
//       queryKey: userKeys.list(filters),
//       queryFn: () => api.get('/users', { params: filters })
//     })
//   )
// }

// ==================== Mutations（增删改） ====================

// export const userMutations = {
//   /** 创建用户 */
//   create: createMutationFactory<User, Error, CreateUserInput>(
//     (api, data) => api.post('/users', data)
//   ),

//   /** 更新当前用户信息 */
//   update: createMutationFactory<User, Error, UpdateUserInput>(
//     (api, data) => api.patch('/users/profile', data)
//   ),

//   /** 更新指定用户（管理员） */
//   updateById: createMutationFactory<User, Error, { id: string; data: UpdateUserInput }>(
//     (api, { id, data }) => api.patch(`/users/${id}`, data)
//   ),

//   /** 删除用户 */
//   delete: createMutationFactory<void, Error, { id: string }>(
//     (api, { id }) => api.delete(`/users/${id}`)
//   )
// }
