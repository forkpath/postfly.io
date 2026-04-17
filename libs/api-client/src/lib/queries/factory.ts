import type { QueryFunction, QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type { ApiClient } from '../client'

import { queryOptions as tanstackQueryOptions } from '@tanstack/react-query'

// ==================== Mutation Factory ====================

/**
 * Mutation Options 类型（不含 mutationFn，由工厂注入）
 */
export type MutationOptionsWithoutFn<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
>

/**
 * 创建 Mutation Options 工厂
 *
 * @example
 * ```ts
 * // 定义 mutation
 * export const createUserMutation = createMutationFactory<User, Error, CreateUserInput>(
 *   (api, data) => api.post('/users', data)
 * )
 *
 * // 基础用法
 * const mutation = useMutation(createUserMutation.options(api, {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: userKeys.all })
 * }))
 *
 * // 乐观更新（指定 TContext 类型）
 * const mutation = useMutation(
 *   createUserMutation.options<{ previousUsers: User[] }>(api, {
 *     onMutate: async (newUser) => {
 *       await queryClient.cancelQueries({ queryKey: userKeys.all })
 *       const previousUsers = queryClient.getQueryData<User[]>(userKeys.all) ?? []
 *       queryClient.setQueryData(userKeys.all, [...previousUsers, newUser])
 *       return { previousUsers }
 *     },
 *     onError: (err, variables, context) => {
 *       // context 类型为 { previousUsers: User[] } | undefined
 *       if (context) queryClient.setQueryData(userKeys.all, context.previousUsers)
 *     }
 *   })
 * )
 * ```
 */
export function createMutationFactory<TData = unknown, TError = Error, TVariables = void>(
  mutationFn: (api: ApiClient, variables: TVariables) => Promise<TData>
) {
  return {
    /** 原始 mutation 函数，用于自定义场景 */
    fn: mutationFn,

    /** 生成完整的 mutation options，TContext 可通过泛型指定以支持乐观更新 */
    options: <TContext = unknown>(
      api: ApiClient,
      opts?: MutationOptionsWithoutFn<TData, TError, TVariables, TContext>
    ): UseMutationOptions<TData, TError, TVariables, TContext> => ({
      ...opts,
      mutationFn: variables => mutationFn(api, variables)
    })
  }
}

/**
 * 创建带额外参数的 Mutation Options 工厂
 *
 * 用于需要在调用时传入额外上下文的场景（如 orgId）
 *
 * @example
 * ```ts
 * // 定义 mutation（需要 orgId 参数）
 * export const inviteMemberMutation = createMutationWithParamsFactory<
 *   Member,
 *   Error,
 *   InviteInput,
 *   { orgId: string }
 * >(
 *   (api, variables, { orgId }) => api.post(`/orgs/${orgId}/members`, variables)
 * )
 *
 * // 基础用法
 * const mutation = useMutation(inviteMemberMutation.options(api, { orgId }, {
 *   onSuccess: () => queryClient.invalidateQueries({ queryKey: orgKeys.members(orgId) })
 * }))
 *
 * // 乐观更新
 * const mutation = useMutation(
 *   inviteMemberMutation.options<{ previousMembers: Member[] }>(api, { orgId }, {
 *     onMutate: async () => {
 *       const previousMembers = queryClient.getQueryData<Member[]>(orgKeys.members(orgId)) ?? []
 *       return { previousMembers }
 *     },
 *     onError: (err, variables, context) => {
 *       if (context) queryClient.setQueryData(orgKeys.members(orgId), context.previousMembers)
 *     }
 *   })
 * )
 * ```
 */
export function createMutationWithParamsFactory<TData = unknown, TError = Error, TVariables = void, TParams = unknown>(
  mutationFn: (api: ApiClient, variables: TVariables, params: TParams) => Promise<TData>
) {
  return {
    /** 原始 mutation 函数 */
    fn: mutationFn,

    /** 生成完整的 mutation options，TContext 可通过泛型指定以支持乐观更新 */
    options: <TContext = unknown>(
      api: ApiClient,
      params: TParams,
      opts?: MutationOptionsWithoutFn<TData, TError, TVariables, TContext>
    ): UseMutationOptions<TData, TError, TVariables, TContext> => ({
      ...opts,
      mutationFn: variables => mutationFn(api, variables, params)
    })
  }
}

// ==================== Query Factory ====================

/**
 * 创建带 API 客户端的 Query Options 工厂
 *
 * 这个模式解决了 SSR 场景下的问题：
 * - Server 端：需要显式传入 api client
 * - Client 端：可以通过 Context 获取
 *
 * @example
 * ```ts
 * // 定义 query options 工厂
 * export const userProfileOptions = createQueryOptionsFactory(api => ({
 *   queryKey: userKeys.profile(),
 *   queryFn: () => api.get('/users/profile')
 * }))
 *
 * // 在组件中使用（Client 端）
 * const api = useApiClient()
 * const { data } = useQuery(userProfileOptions(api))
 *
 * // 在 loader 中使用（Server 端）
 * export const loader = async () => {
 *   const api = createClient({ runtime: 'ssr' })
 *   return queryClient.fetchQuery(userProfileOptions(api))
 * }
 * ```
 */
export function createQueryOptionsFactory<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  factory: (api: ApiClient) => {
    queryKey: TQueryKey
    queryFn: QueryFunction<TQueryFnData, TQueryKey>
  } & Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) {
  return (api: ApiClient) => tanstackQueryOptions(factory(api))
}

/**
 * 创建带参数的 Query Options 工厂
 *
 * @example
 * ```ts
 * export const userDetailOptions = createQueryOptionsWithParams<
 *   User,
 *   Error,
 *   User,
 *   { userId: string }
 * >((api, { userId }) => ({
 *   queryKey: userKeys.detail(userId),
 *   queryFn: () => api.get(`/users/${userId}`)
 * }))
 *
 * // 使用
 * const { data } = useQuery(userDetailOptions(api, { userId: '123' }))
 * ```
 */
export function createQueryOptionsWithParams<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TParams = unknown,
  TQueryKey extends QueryKey = QueryKey
>(
  factory: (
    api: ApiClient,
    params: TParams
  ) => {
    queryKey: TQueryKey
    queryFn: QueryFunction<TQueryFnData, TQueryKey>
  } & Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>
) {
  return (api: ApiClient, params: TParams) => tanstackQueryOptions(factory(api, params))
}
