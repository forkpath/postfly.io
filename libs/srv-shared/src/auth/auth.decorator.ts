import type { CustomDecorator, ExecutionContext } from '@nestjs/common'
import type { createAuthMiddleware } from 'better-auth/api'

import { createParamDecorator, SetMetadata } from '@nestjs/common'

import { AFTER_HOOK_KEY, BEFORE_HOOK_KEY, HOOK_KEY } from './auth-module-definition'
import { getRequestFromContext } from './utils'

/**
 * 允许匿名访问路由或控制器。
 * 标记后 AuthGuard 不会进行鉴权。
 */
export const AllowAnonymous = (): CustomDecorator<string> => SetMetadata('PUBLIC', true)

/**
 * 标记为可选鉴权。
 * 即使没有 session 也允许请求通过。
 */
export const OptionalAuth = (): CustomDecorator<string> => SetMetadata('OPTIONAL', true)

/**
 * 指定访问路由/控制器所需的角色。
 * AuthGuard 会校验用户角色是否满足要求。
 * @param roles - 所需角色列表
 */
export const Roles = (roles: string[]): CustomDecorator => SetMetadata('ROLES', roles)

/**
 * @deprecated 请使用 AllowAnonymous()
 */
export const Public = AllowAnonymous

/**
 * @deprecated 请使用 OptionalAuth()
 */
export const Optional = OptionalAuth

/**
 * 参数装饰器：从请求中获取 session。
 * 用于控制器方法中快速访问当前用户会话信息。
 */
export const Session: ReturnType<typeof createParamDecorator> = createParamDecorator(
  (_data: unknown, context: ExecutionContext): unknown => {
    const request = getRequestFromContext(context)
    return request.session
  }
)
/**
 * Hook 上下文类型（来自 createAuthMiddleware 的参数）。
 */
export type AuthHookContext = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0]

/**
 * 注册路由前置 Hook。
 * @param path - 触发 Hook 的 auth 路径（必须以 '/' 开头）
 */
export const BeforeHook = (path?: `/${string}`): CustomDecorator<symbol> => SetMetadata(BEFORE_HOOK_KEY, path)

/**
 * 注册路由后置 Hook。
 * @param path - 触发 Hook 的 auth 路径（必须以 '/' 开头）
 */
export const AfterHook = (path?: `/${string}`): CustomDecorator<symbol> => SetMetadata(AFTER_HOOK_KEY, path)

/**
 * 标记类中包含 Hook 方法。
 * 使用 BeforeHook / AfterHook 的类必须加上该装饰器。
 */
export const Hook = (): ClassDecorator => SetMetadata(HOOK_KEY, true)
