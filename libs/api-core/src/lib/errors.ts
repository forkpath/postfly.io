import type { AxiosResponse } from 'axios'

export class ApiError extends Error {
  readonly code?: number
  readonly status?: number
  readonly data?: unknown
  readonly response?: AxiosResponse

  constructor(message: string, opts?: { code?: number; status?: number; data?: unknown; response?: AxiosResponse }) {
    super(message)
    this.name = 'ApiError'
    this.code = opts?.code
    this.status = opts?.status
    this.data = opts?.data
    this.response = opts?.response
  }
}

export class ApiNetworkError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'ApiNetworkError'
    this.cause = cause
  }
}
