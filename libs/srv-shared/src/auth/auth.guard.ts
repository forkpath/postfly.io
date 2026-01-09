import type { CanActivate, ContextType, ExecutionContext } from '@nestjs/common'
import type { AuthModuleOptions } from './auth-module-definition'
import type { getSession } from 'better-auth/api'

import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { fromNodeHeaders } from 'better-auth/node'

import { MODULE_OPTIONS_TOKEN } from './auth-module-definition'
import { getRequestFromContext } from './utils'

/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type BaseUserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>

export type UserSession = BaseUserSession & {
  user: BaseUserSession['user'] & {
    role?: string | string[]
  }
}

/**
 * Lazy-load WsException to make @nestjs/websockets an optional dependency
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let WsException: any
function getWsException() {
  if (!WsException) {
    try {
      WsException = require('@nestjs/websockets').WsException
    } catch (error) {
      throw new Error(
        '@nestjs/websockets is required for WebSocket support. Please install it: npm install @nestjs/websockets @nestjs/platform-ws, error: ' +
          error
      )
    }
  }
  return WsException
}

const AuthContextErrorMap: Record<ContextType, Record<'UNAUTHORIZED' | 'FORBIDDEN', (args?: unknown) => Error>> = {
  http: {
    UNAUTHORIZED: args =>
      new UnauthorizedException(
        args ?? {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized'
        }
      ),
    FORBIDDEN: args =>
      new ForbiddenException(
        args ?? {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      )
  },
  ws: {
    UNAUTHORIZED: args => {
      const WsExceptionClass = getWsException()
      return new WsExceptionClass(args ?? 'UNAUTHORIZED')
    },
    FORBIDDEN: args => {
      const WsExceptionClass = getWsException()
      return new WsExceptionClass(args ?? 'FORBIDDEN')
    }
  },
  rpc: {
    UNAUTHORIZED: () => new Error('UNAUTHORIZED'),
    FORBIDDEN: () => new Error('FORBIDDEN')
  }
}

/**
 * NestJS guard that handles authentication for protected routes
 * Can be configured with @AllowAnonymous() or @OptionalAuth() decorators to modify authentication behavior
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: AuthModuleOptions
  ) {}

  /**
   * Validates if the current request is authenticated
   * Attaches session and user information to the request object
   * Supports HTTP, GraphQL and WebSocket execution contexts
   * @param context - The execution context of the current request
   * @returns True if the request is authorized to proceed, throws an error otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequestFromContext(context)
    const session: UserSession | null = await this.options.auth.api.getSession({
      headers: fromNodeHeaders(request.headers || request?.handshake?.headers || [])
    })

    request.session = session
    request.user = session?.user ?? null // useful for observability tools like Sentry

    const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [context.getHandler(), context.getClass()])

    if (isPublic) return true

    const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL', [context.getHandler(), context.getClass()])

    if (!session && isOptional) return true

    const ctxType = context.getType()
    if (!session) throw AuthContextErrorMap[ctxType].UNAUTHORIZED()

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('ROLES', [
      context.getHandler(),
      context.getClass()
    ])

    if (requiredRoles && requiredRoles.length > 0) {
      const userRole = session.user.role
      let hasRole = false
      if (Array.isArray(userRole)) {
        hasRole = userRole.some(role => requiredRoles.includes(role))
      } else if (typeof userRole === 'string') {
        hasRole = userRole.split(',').some(role => requiredRoles.includes(role))
      }

      if (!hasRole) throw AuthContextErrorMap[ctxType].FORBIDDEN()
    }

    return true
  }
}
