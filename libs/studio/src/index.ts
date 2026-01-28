// Client-side auth (可在 SPA 和 SSR 客户端使用)
export { authClient } from './lib/auth/client'

// Server-side auth 不从主入口导出，只能在 SSR 环境中单独导入：
// import { getSession } from '@libs/studio/lib/auth/server'

export * from './common/toast'
export * from './common/go-link'
export * from './auth'
export * from './admin'
export * from './billing'
export * from './dashboard'
export * from './organization'
export * from './user'
export * from './lib/privider/theme'
export * from './lib/privider/theme-script'
export { appConfig } from './config/app'
