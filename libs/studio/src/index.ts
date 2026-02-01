// Client-side auth (可在 SPA 和 SSR 客户端使用)
export { authClient } from './lib/auth/client'

// Server-side auth 不从主入口导出，只能在 SSR 环境中单独导入：
// import { getSession } from '@libs/studio/lib/auth/server'

export * from './common'
export * from './components/toast'
export * from './components/go-link'
export * from './components/layout'
export * from './modules/auth'
export * from './modules/admin'
export * from './modules/billing'
export * from './modules/crm'
export * from './modules/organization'
export * from './modules/user'
export * from './modules/workspace'
export * from './lib/privider/theme'
export * from './lib/privider/theme-script'
export { appConfig } from './config/app'
