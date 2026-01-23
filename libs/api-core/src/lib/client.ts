import type { ApiCoreOptions, ApiRequestConfig, WrappedResponse } from './types'

import axios, { AxiosError, AxiosInstance } from 'axios'

import { ApiError, ApiNetworkError } from './errors'

const DEFAULT_AUTH_BASE_PATH = '/api/auth'

function isWrappedResponse(data: unknown): data is WrappedResponse<unknown> {
  return (
    !!data &&
    typeof data === 'object' &&
    'code' in data &&
    'msg' in data &&
    (data as { msg: unknown }).msg !== undefined
  )
}

function shouldSkipWrap(config: ApiRequestConfig, authBasePath: string) {
  if (config.api?.skipWrap) return true
  const url = config.url ?? ''
  return url.startsWith(authBasePath)
}

export function createApiClient(options: ApiCoreOptions): AxiosInstance {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 30_000,
    withCredentials: options.withCredentials ?? true,
    adapter: options.adapter,
    headers: options.headers
  })

  const authBasePath = options.authBasePath ?? DEFAULT_AUTH_BASE_PATH

  instance.interceptors.request.use(async config => {
    const auth = options.auth
    if (!auth?.getAccessToken) return config

    // 允许由外部注入 token（cookie 模式可返回空）
    const token = await auth.getAccessToken()
    const headerName = auth.headerName ?? 'Authorization'
    if (!token && !auth.alwaysSetHeader) return config

    const value = token ? (auth.format ? auth.format(token) : `Bearer ${token}`) : ''
    config.headers.set(headerName, value)
    return config
  })

  instance.interceptors.response.use(
    response => {
      const config = response.config as ApiRequestConfig
      // raw 模式直接返回 AxiosResponse
      if (config.api?.raw) return response

      // better-auth 等不走统一 wrap 的接口直接透传
      if (shouldSkipWrap(config, authBasePath)) {
        return response.data
      }

      const data = response.data
      if (!isWrappedResponse(data)) {
        // 兜底：后端未走统一 wrap 时，直接透传
        return data
      }

      if (data.code === 0) {
        return data.data
      }

      throw new ApiError(data.msg || 'Request failed', {
        code: data.code,
        status: response.status,
        data,
        response
      })
    },
    error => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error)
      }

      const axiosError = error as AxiosError
      const response = axiosError.response
      if (!response) {
        return Promise.reject(new ApiNetworkError(axiosError.message, axiosError))
      }

      const data = response.data
      if (isWrappedResponse(data)) {
        return Promise.reject(
          new ApiError(data.msg || 'Request failed', {
            code: data.code,
            status: response.status,
            data,
            response
          })
        )
      }

      return Promise.reject(
        new ApiError(axiosError.message, {
          status: response.status,
          data,
          response
        })
      )
    }
  )

  return instance
}
