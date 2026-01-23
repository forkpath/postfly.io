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
