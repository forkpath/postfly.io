import type { Auth } from 'better-auth'
import type { NextFunction, Request, Response } from 'express'

import { ConfigurableModuleBuilder } from '@nestjs/common'

// auth 实例类型（better-auth 返回值）
export type AuthType = Auth

// 模块配置项：auth 实例 + 行为开关
export type AuthModuleOptions<A = AuthType> = {
  auth: A
  disableTrustedOriginsCors?: boolean
  disableBodyParser?: boolean
  middleware?: (req: Request, res: Response, next: NextFunction) => void
}

// Nest 注入 token
export const MODULE_OPTIONS_TOKEN = Symbol('AUTH_MODULE_OPTIONS') as symbol

// Hook 相关元数据 key
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
        disableGlobalAuthGuard: false,
        disableControllers: false
      },
      (def, extras) => {
        return {
          ...def,
          exports: [MODULE_OPTIONS_TOKEN],
          global: extras.isGlobal
        }
      }
    )
    .build()
