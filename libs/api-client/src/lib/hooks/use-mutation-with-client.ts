/**
 * useMutationWithClient - 自动注入 API 客户端的 useMutation 封装
 *
 * 适用场景：
 * - 组件内一次性的 mutation 调用，不需要跨组件复用
 * - 快速原型开发，无需在 domains/ 中预定义工厂函数
 * - 特定页面/组件的专用 API 调用
 *
 * 与 domains/ 工厂模式的对比：
 * - domains/ 工厂模式：适合可复用的、标准化的 API（如 userMutations.update）
 * - useMutationWithClient：适合一次性的、组件特定的 API 调用
 *
 * 注意：如果某个 mutation 在多处使用，建议提取到 domains/ 中作为工厂函数复用
 */
import type { DefaultError, UseMutationOptions, UseMutationResult } from '@tanstack/react-query'
import type { AxiosInstance } from 'axios'

import { useMutation } from '@tanstack/react-query'

import { useApiClient } from '../context'

type MutationOptionsWithClient<TData, TError, TVariables, TContext> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  'mutationFn'
> & {
  mutationFn: (api: AxiosInstance, variables: TVariables) => Promise<TData>
}

/**
 * useMutation 的封装，自动注入 API 客户端
 *
 * @example
 * ```tsx
 * function CreateUser() {
 *   const mutation = useMutationWithClient({
 *     mutationFn: (api, data: CreateUserInput) => api.post('/users', data),
 *     onSuccess: () => {
 *       queryClient.invalidateQueries({ queryKey: ['users'] })
 *     }
 *   })
 *
 *   return (
 *     <button onClick={() => mutation.mutate({ name: 'John' })}>
 *       Create User
 *     </button>
 *   )
 * }
 * ```
 */
export function useMutationWithClient<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown>(
  options: MutationOptionsWithClient<TData, TError, TVariables, TContext>
): UseMutationResult<TData, TError, TVariables, TContext> {
  const api = useApiClient()
  const { mutationFn, ...rest } = options

  return useMutation({
    ...rest,
    mutationFn: variables => mutationFn(api, variables)
  })
}
