import type { AuthModuleOptions } from './auth-module-definition'
import type { Auth } from 'better-auth'

import { Inject } from '@nestjs/common'

import { MODULE_OPTIONS_TOKEN } from './auth-module-definition'

/**
 * 封装 Better Auth 实例的服务。
 * 使用泛型以支持插件扩展后的 auth 类型。
 */
export class AuthService<T extends { api: T['api'] } = Auth> {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: AuthModuleOptions<T>
  ) {}

  /**
   * 获取 auth 实例的 API 端点。
   */
  get api(): T['api'] {
    return this.options.auth.api
  }

  /**
   * 获取完整 auth 实例（用于插件能力）。
   */
  get instance(): T {
    return this.options.auth
  }
}
