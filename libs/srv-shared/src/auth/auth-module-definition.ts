import type { Auth } from 'better-auth'
import type { NextFunction, Request, Response } from 'express'

import { ConfigurableModuleBuilder } from '@nestjs/common'

export type AuthType = Auth

export type AuthModuleOptions<A = AuthType> = {
  auth: A
  disableTrustedOriginsCors?: boolean
  disableBodyParser?: boolean
  disableGlobalAuthGuard?: boolean
  disableControllers?: boolean
  middleware?: (req: Request, res: Response, next: NextFunction) => void
}

export const MODULE_OPTIONS_TOKEN = Symbol('AUTH_MODULE_OPTIONS') as symbol

// Hooks
export const BEFORE_HOOK_KEY = Symbol('BEFORE_HOOK') as symbol
export const AFTER_HOOK_KEY = Symbol('AFTER_HOOK') as symbol
export const HOOK_KEY = Symbol('HOOK') as symbol

export const { ConfigurableModuleClass, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<AuthModuleOptions>({
    optionsInjectionToken: MODULE_OPTIONS_TOKEN
  })
    .setClassMethodName('forRoot')
    .setExtras(
      {
        isGlobal: true,
        disableTrustedOriginsCors: false,
        disableBodyParser: false,
        disableGlobalAuthGuard: false,
        disableControllers: false
      },
      (def, extras) => {
        // Merge extras into the options provider
        const optionsProvider = def.providers?.find(
          p => typeof p === 'object' && 'provide' in p && p.provide === MODULE_OPTIONS_TOKEN
        )

        if (optionsProvider && typeof optionsProvider !== 'function' && 'useValue' in optionsProvider) {
          optionsProvider.useValue = {
            ...optionsProvider.useValue,
            ...extras
          }
        } else if (optionsProvider && typeof optionsProvider !== 'function' && 'useFactory' in optionsProvider) {
          const originalFactory = optionsProvider.useFactory
          optionsProvider.useFactory = (...args: unknown[]) => {
            const result = typeof originalFactory === 'function' ? originalFactory(...args) : originalFactory
            return {
              ...result,
              ...extras
            }
          }
        }

        return {
          ...def,
          exports: [MODULE_OPTIONS_TOKEN],
          global: extras.isGlobal
        }
      }
    )
    .build()
