import type { PropsWithChildren } from 'react'
import type { ApiClientContextValue, ApiClientOptions, ApiRuntime } from './types'
import type { AxiosInstance } from 'axios'

import { createContext, useContext, useRef } from 'react'

import { createClient, detectRuntime } from './client'

const ApiClientContext = createContext<ApiClientContextValue | null>(null)

export interface ApiClientProviderProps extends PropsWithChildren {
  /**
   * 配置选项（仅在首次渲染时生效，后续变化会被忽略）
   *
   * 如需动态更新配置，请传入新的 `client` 实例
   */
  options?: ApiClientOptions

  /**
   * 直接传入已创建的 client 实例（用于 SSR hydration 或动态配置）
   *
   * 当此 prop 变化时，会使用新的 client 实例
   */
  client?: AxiosInstance

  /**
   * 运行时环境（如果未提供 client，会自动检测）
   */
  runtime?: ApiRuntime
}

/**
 * API 客户端 Provider
 *
 * 注意：`options` 仅在首次渲染时使用，后续变化会被忽略以避免重建 client。
 * 如需动态配置，请直接传入新的 `client` 实例。
 *
 * @example
 * ```tsx
 * // 基础用法（自动检测运行时）
 * <ApiClientProvider>
 *   <App />
 * </ApiClientProvider>
 *
 * // 自定义配置（options 仅首次生效）
 * <ApiClientProvider options={{ baseURL: '/api', timeout: 10000 }}>
 *   <App />
 * </ApiClientProvider>
 *
 * // SSR：传入预创建的 client
 * <ApiClientProvider client={ssrClient} runtime="ssr">
 *   <App />
 * </ApiClientProvider>
 *
 * // 动态配置：传入新的 client 实例
 * const [apiClient, setApiClient] = useState(() => createClient({ baseURL: '/api' }))
 * <ApiClientProvider client={apiClient}>
 *   <App />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({ children, options, client, runtime }: ApiClientProviderProps) {
  // 使用 ref 存储初始配置，避免 options 对象引用变化导致重建
  const initialOptionsRef = useRef(options)
  const initialRuntimeRef = useRef(runtime)

  // 使用 ref 存储内部创建的 client，确保只创建一次
  const internalClientRef = useRef<AxiosInstance | null>(null)

  // 计算最终的 runtime
  const resolvedRuntime = runtime ?? initialRuntimeRef.current ?? initialOptionsRef.current?.runtime ?? detectRuntime()

  // 确定使用的 client：优先使用外部传入的，否则使用内部创建的
  let resolvedClient: AxiosInstance
  if (client) {
    // 外部传入的 client，直接使用（支持动态变化）
    resolvedClient = client
  } else {
    // 内部创建的 client，只创建一次
    if (!internalClientRef.current) {
      internalClientRef.current = createClient({
        ...initialOptionsRef.current,
        runtime: resolvedRuntime
      })
    }
    resolvedClient = internalClientRef.current
  }

  const value: ApiClientContextValue = {
    client: resolvedClient,
    runtime: resolvedRuntime,
    options: initialOptionsRef.current ?? {}
  }

  return <ApiClientContext.Provider value={value}>{children}</ApiClientContext.Provider>
}

/**
 * 获取 API 客户端上下文
 *
 * @throws 如果在 ApiClientProvider 外部使用会抛出错误
 */
export function useApiClientContext(): ApiClientContextValue {
  const context = useContext(ApiClientContext)
  if (!context) {
    throw new Error('useApiClientContext must be used within ApiClientProvider')
  }
  return context
}

/**
 * 获取 Axios 实例
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const api = useApiClient()
 *
 *   const fetchData = async () => {
 *     const data = await api.get('/users')
 *     return data
 *   }
 * }
 * ```
 */
export function useApiClient(): AxiosInstance {
  return useApiClientContext().client
}

/**
 * 获取当前运行时环境
 */
export function useApiRuntime(): ApiRuntime {
  return useApiClientContext().runtime
}
