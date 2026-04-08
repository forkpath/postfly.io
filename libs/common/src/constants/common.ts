export const NodeEnv = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test'
} as const

export const SortOrder = {
  ASCENDING: 'asc',
  DESCENDING: 'desc'
} as const

export const Platform = {
  WEB: 'web',
  MOBILE: 'mobile',
  EXTENSION: 'extension',
  DESKTOP: 'desktop',
  SSR: 'ssr'
} as const

export const ExecutionSide = {
  CLIENT: 'client',
  SERVER: 'server'
} as const

export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]
