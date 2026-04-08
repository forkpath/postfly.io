import type { AxiosAdapter, AxiosInstance } from 'axios'

/**
 * API 客户端运行时环境
 */
export type ApiRuntime = 'web' | 'desktop' | 'ssr' | 'mobile' | 'extension'

/**
 * 鉴权配置选项
 *
 * 用于非 cookie 模式的 token 注入，支持多租户、非 Bearer 方案等场景
 */
export interface AuthOptions {
  /**
   * 返回当前请求的鉴权 token（如果走 cookie 可返回空）
   */
  getAccessToken?: () => string | undefined | Promise<string | undefined>

  /**
   * Header 名称
   * @default 'Authorization'
   */
  headerName?: string

  /**
   * Token 为空时是否仍写入 header
   * @default false
   */
  alwaysSetHeader?: boolean

  /**
   * 对 token 进行格式化
   * @default (token) => `Bearer ${token}`
   *
   * @example
   * ```ts
   * // 自定义格式
   * format: (token) => `Token ${token}`
   *
   * // 多租户场景
   * format: (token) => `Bearer ${token}; tenant=${tenantId}`
   * ```
   */
  format?: (token: string) => string
}

/**
 * API 客户端配置选项
 */
export interface ApiClientOptions {
  /**
   * API 基础路径
   * @default '/api/v1' (web/ssr) 或完整 URL (desktop)
   */
  baseURL?: string

  /**
   * 运行时环境
   * @default 自动检测
   */
  runtime?: ApiRuntime

  /**
   * 请求超时时间（毫秒）
   * @default 30000
   */
  timeout?: number

  /**
   * 是否携带凭证（cookie）
   * @default true
   */
  withCredentials?: boolean

  /**
   * better-auth 路径前缀（跳过响应解包）
   * @default '/api/auth'
   */
  authBasePath?: string

  /**
   * 自定义 Axios 适配器（用于不同运行时）
   */
  adapter?: AxiosAdapter

  /**
   * 额外请求头
   */
  headers?: Record<string, string>

  /**
   * 鉴权配置（可选，用于非 cookie 模式）
   *
   * @example
   * ```ts
   * // 简单用法
   * auth: {
   *   getAccessToken: () => localStorage.getItem('token')
   * }
   *
   * // 自定义 header 和格式
   * auth: {
   *   getAccessToken: () => getToken(),
   *   headerName: 'X-Auth-Token',
   *   format: (token) => `Token ${token}`
   * }
   * ```
   */
  auth?: AuthOptions
}

/**
 * API 客户端上下文值
 */
export interface ApiClientContextValue {
  /**
   * Axios 实例
   */
  client: AxiosInstance

  /**
   * 当前运行时环境
   */
  runtime: ApiRuntime

  /**
   * 原始配置
   */
  options: ApiClientOptions
}
