import type { ApiClientOptions, ApiRuntime } from './types'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

import { createApiClient } from '@libs/api-core'
import { Platform } from '@libs/common'

/**
 * Axios 封装客户端：由于 response 拦截器已解包 data，这里重新声明方法以返回 `Promise<T>`
 * 便于在类型层面消费真实业务数据，不再需要手动访问 `.data`。
 */
export interface ApiClient
  extends Omit<AxiosInstance, 'get' | 'delete' | 'head' | 'options' | 'post' | 'put' | 'patch'> {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  head<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  options<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T>
  post<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>
  put<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>
  patch<T = unknown, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>
}

/**
 * 检测当前运行时环境
 */
export function detectRuntime(): ApiRuntime {
  if (typeof window === 'undefined') {
    return Platform.SSR
  }
  // React Native 环境检测
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return Platform.MOBILE
  }
  // 浏览器扩展Extension 环境检测
  if (
    typeof window !== 'undefined' &&
    (window as Window & { chrome?: { runtime?: { id?: string } } }).chrome?.runtime?.id
  ) {
    return Platform.EXTENSION
  }
  // Electron 环境检测
  if (
    typeof window !== 'undefined' &&
    'process' in window &&
    typeof window.process === 'object' &&
    window.process !== null &&
    'type' in window.process &&
    window.process.type === 'renderer'
  ) {
    return Platform.DESKTOP
  }
  return Platform.WEB
}

/**
 * 根据运行时获取默认 baseURL
 */
function getDefaultBaseURL(runtime: ApiRuntime): string {
  switch (runtime) {
    case 'ssr':
      // SSR 环境需要完整 URL，从环境变量获取
      return process.env['API_BASE_URL'] || 'http://localhost:8000'
    case 'desktop':
    case 'extension':
      // Desktop 通过 IPC 或直接请求后端
      return process.env['VITE_API_BASE_URL'] || 'http://localhost:8000'
    case 'mobile':
      // Mobile 需要完整 URL，从环境变量获取
      return process.env['EXPO_PUBLIC_API_BASE_URL'] || 'http://localhost:8000'
    case 'web':
    default:
      // Web SPA 通过代理，使用相对路径
      return ''
  }
}

/**
 * 创建 API 客户端实例
 *
 * @example
 * ```ts
 * // Web SPA（使用 vite proxy）
 * const api = createClient({ runtime: 'web' })
 *
 * // SSR
 * const api = createClient({ runtime: 'ssr', baseURL: 'http://api.example.com' })
 *
 * // Desktop
 * const api = createClient({ runtime: 'desktop' })
 *
 * // Mobile (React Native) - 需要 token-based 认证
 * const api = createClient({
 *   runtime: 'mobile',
 *   baseURL: 'https://api.example.com',
 *   withCredentials: false,
 *   auth: {
 *     getAccessToken: async () => await SecureStore.getItemAsync('auth_token')
 *   }
 * })
 *
 * // 自定义鉴权
 * const api = createClient({
 *   auth: {
 *     getAccessToken: () => getToken(),
 *     headerName: 'X-Auth-Token',
 *     format: (token) => `Token ${token}`
 *   }
 * })
 * ```
 */
export function createClient(options: ApiClientOptions = {}): ApiClient {
  const runtime = options.runtime ?? detectRuntime()
  const baseURL = options.baseURL ?? getDefaultBaseURL(runtime)

  return createApiClient({
    baseURL,
    timeout: options.timeout ?? 30_000,
    withCredentials: options.withCredentials ?? true,
    adapter: options.adapter,
    headers: options.headers,
    authBasePath: options.authBasePath ?? '/api/auth',
    auth: options.auth
  }) as unknown as ApiClient
}
