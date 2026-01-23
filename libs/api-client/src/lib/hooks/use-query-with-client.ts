import type {
  DefaultError,
  DefinedInitialDataOptions,
  DefinedUseQueryResult,
  QueryFunctionContext,
  QueryKey,
  UndefinedInitialDataOptions,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query'
import type { AxiosInstance } from 'axios'

import { useQuery } from '@tanstack/react-query'

import { useApiClient } from '../context'

/**
 * 带 API 客户端的 QueryFunctionContext
 */
export interface QueryFunctionContextWithClient<TQueryKey extends QueryKey = QueryKey>
  extends QueryFunctionContext<TQueryKey> {
  api: AxiosInstance
}

type QueryOptionsWithClient<TQueryFnData, TError, TData, TQueryKey extends QueryKey> = Omit<
  UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'queryFn'
> & {
  /**
   * Query 函数，接收 API 客户端和完整的 QueryFunctionContext
   *
   * 支持同步或异步返回（与 TanStack Query 原生行为一致）
   *
   * @param context.api - Axios 实例
   * @param context.queryKey - 当前 query key
   * @param context.signal - AbortSignal，用于取消请求
   * @param context.meta - Query meta 数据
   * @returns 数据或 Promise
   */
  queryFn: (context: QueryFunctionContextWithClient<TQueryKey>) => TQueryFnData | Promise<TQueryFnData>
}

/**
 * useQuery 的封装，自动注入 API 客户端
 *
 * @example
 * ```tsx
 * // 基础用法
 * function UserProfile() {
 *   const { data, isLoading } = useQueryWithClient({
 *     queryKey: ['user', 'profile'],
 *     queryFn: ({ api }) => api.get('/users/profile')
 *   })
 * }
 *
 * // 使用 signal 支持请求取消
 * function UserDetail({ userId }: { userId: string }) {
 *   const { data } = useQueryWithClient({
 *     queryKey: ['user', userId],
 *     queryFn: ({ api, signal }) => api.get(`/users/${userId}`, { signal })
 *   })
 * }
 *
 * // 从 queryKey 获取参数
 * function UserDetail({ userId }: { userId: string }) {
 *   const { data } = useQueryWithClient({
 *     queryKey: ['user', userId] as const,
 *     queryFn: ({ api, queryKey }) => {
 *       const [, id] = queryKey
 *       return api.get(`/users/${id}`)
 *     }
 *   })
 * }
 * ```
 */
export function useQueryWithClient<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: QueryOptionsWithClient<TQueryFnData, TError, TData, TQueryKey> &
    UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError>

export function useQueryWithClient<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(
  options: QueryOptionsWithClient<TQueryFnData, TError, TData, TQueryKey> &
    DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
): DefinedUseQueryResult<TData, TError>

export function useQueryWithClient<
  TQueryFnData = unknown,
  TError = DefaultError,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey
>(options: QueryOptionsWithClient<TQueryFnData, TError, TData, TQueryKey>): UseQueryResult<TData, TError> {
  const api = useApiClient()
  const { queryFn, ...rest } = options

  return useQuery({
    ...rest,
    queryFn: context => queryFn({ ...context, api })
  } as UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>)
}
