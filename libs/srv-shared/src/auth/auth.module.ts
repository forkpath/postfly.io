import type { DynamicModule, MiddlewareConsumer, NestModule, OnModuleInit } from '@nestjs/common'
import type { ASYNC_OPTIONS_TYPE, AuthModuleOptions, OPTIONS_TYPE } from './auth-module-definition'
import type { Request, Response } from 'express'

import { Inject, Logger, Module } from '@nestjs/common'
import { APP_GUARD, DiscoveryModule, DiscoveryService, HttpAdapterHost, MetadataScanner } from '@nestjs/core'

import { toNodeHandler } from 'better-auth/node'
import { createAuthMiddleware } from 'better-auth/plugins'

import {
  AFTER_HOOK_KEY,
  AuthType,
  BEFORE_HOOK_KEY,
  ConfigurableModuleClass,
  HOOK_KEY,
  MODULE_OPTIONS_TOKEN
} from './auth-module-definition'
import { AuthGuard } from './auth.guard'
import { SkipBodyParsingMiddleware } from './auth.middleware'
import { AuthService } from './auth.service'

const HOOKS = [
  { metadataKey: BEFORE_HOOK_KEY, hookType: 'before' as const },
  { metadataKey: AFTER_HOOK_KEY, hookType: 'after' as const }
]

/**
 * NestJS 模块：用于接入 Better Auth。
 * 提供认证中间件、Hook 支持与异常处理。
 */
@Module({
  imports: [DiscoveryModule],
  providers: [AuthService],
  exports: [AuthService]
})
export class AuthModule extends ConfigurableModuleClass implements NestModule, OnModuleInit {
  private readonly logger = new Logger(AuthModule.name)
  constructor(
    @Inject(DiscoveryService)
    private readonly discoveryService: DiscoveryService,
    @Inject(MetadataScanner)
    private readonly metadataScanner: MetadataScanner,
    @Inject(HttpAdapterHost)
    private readonly adapter: HttpAdapterHost,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: AuthModuleOptions
  ) {
    super()
  }

  onModuleInit(): void {
    const providers = this.discoveryService
      .getProviders()
      .filter(({ metatype }) => metatype && Reflect.getMetadata(HOOK_KEY, metatype))

    const hasHookProviders = providers.length > 0
    const hooksConfigured = typeof this.options.auth?.options?.hooks === 'object'

    // 如果有 @Hook provider，但 auth.options.hooks 未配置，则直接报错
    if (hasHookProviders && !hooksConfigured)
      throw new Error(
        "Detected @Hook providers but Better Auth 'hooks' are not configured. Add 'hooks: {}' to your betterAuth(...) options."
      )

    // 未配置 hooks 时，无需扫描/绑定
    if (!hooksConfigured) return

    // 扫描所有 Hook provider 方法，并按元数据注册
    for (const provider of providers) {
      const providerPrototype = Object.getPrototypeOf(provider.instance)
      const methods = this.metadataScanner.getAllMethodNames(providerPrototype)

      for (const method of methods) {
        const providerMethod = providerPrototype[method]
        this.setupHooks(providerMethod, provider.instance)
      }
    }
  }

  configure(consumer: MiddlewareConsumer): void {
    const trustedOrigins = this.options.auth.options.trustedOrigins
    // function 形式的 trustedOrigins 需要 Web Request，不适配 Nest 的 Express Request
    const isNotFunctionBased = trustedOrigins && Array.isArray(trustedOrigins)

    if (!this.options.disableTrustedOriginsCors && isNotFunctionBased) {
      this.adapter.httpAdapter.enableCors({
        origin: trustedOrigins,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      })
    } else if (trustedOrigins && !this.options.disableTrustedOriginsCors && !isNotFunctionBased)
      throw new Error(
        'Function-based trustedOrigins not supported in NestJS. Use string array or disable CORS with disableTrustedOriginsCors: true.'
      )

    // 从配置获取 basePath，未配置则使用默认值
    let basePath = this.options.auth.options.basePath ?? '/api/auth'

    // 确保 basePath 以 / 开头
    if (!basePath.startsWith('/')) {
      basePath = `/${basePath}`
    }

    // 确保 basePath 不以 / 结尾
    if (basePath.endsWith('/')) {
      basePath = basePath.slice(0, -1)
    }

    if (!this.options.disableBodyParser) {
      consumer.apply(SkipBodyParsingMiddleware(basePath)).forRoutes('*')
    }

    // 将 better-auth 路由挂载到 Nest 的 HTTP 适配器
    const handler = toNodeHandler(this.options.auth)
    this.adapter.httpAdapter.getInstance().use(basePath, (req: Request, res: Response) => {
      if (this.options.middleware) {
        return this.options.middleware(req, res, () => handler(req, res))
      }
      return handler(req, res)
    })
    this.logger.log(`AuthModule initialized BetterAuth on '${basePath}'`)
  }

  private setupHooks(
    providerMethod: (...args: unknown[]) => unknown,
    providerClass: { new (...args: unknown[]): unknown }
  ) {
    if (!this.options.auth.options.hooks) return

    // 根据 @BeforeHook / @AfterHook 元数据注册对应钩子
    for (const { metadataKey, hookType } of HOOKS) {
      const hasHook = Reflect.hasMetadata(metadataKey, providerMethod)
      if (!hasHook) continue

      const hookPath = Reflect.getMetadata(metadataKey, providerMethod)

      const originalHook = this.options.auth.options.hooks[hookType]
      this.options.auth.options.hooks[hookType] = createAuthMiddleware(async ctx => {
        if (originalHook) {
          await originalHook(ctx)
        }

        if (hookPath && hookPath !== ctx.path) return

        await providerMethod.apply(providerClass, [ctx])
      })
    }
  }

  static forRootAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    const forRootAsyncResult = super.forRootAsync(options)
    const { module } = forRootAsyncResult
    return {
      ...forRootAsyncResult,
      module: options.disableControllers ? AuthModuleWithoutCcontrollers : module,
      controllers: options.disableControllers ? [] : forRootAsyncResult.controllers,
      providers: [
        ...(forRootAsyncResult.providers ?? []),
        ...(!options.disableGlobalAuthGuard
          ? [
              {
                provide: APP_GUARD,
                useClass: AuthGuard
              }
            ]
          : [])
      ]
    }
  }

  static forRoot(options: typeof OPTIONS_TYPE): DynamicModule
  /**
   * @deprecated 请使用对象签名：AuthModule.forRoot({ auth, ...options })
   */
  static forRoot(auth: AuthType, options?: Omit<typeof OPTIONS_TYPE, 'auth'>): DynamicModule
  static forRoot(arg1: AuthType | typeof OPTIONS_TYPE, arg2?: Omit<typeof OPTIONS_TYPE, 'auth'>): DynamicModule {
    const normalizedOptions: typeof OPTIONS_TYPE =
      typeof arg1 === 'object' && arg1 !== null && 'auth' in (arg1 as object)
        ? (arg1 as typeof OPTIONS_TYPE)
        : ({ ...(arg2 ?? {}), auth: arg1 as AuthType } as typeof OPTIONS_TYPE)

    const forRootResult = super.forRoot(normalizedOptions)
    const { module } = forRootResult

    return {
      ...forRootResult,
      module: normalizedOptions.disableControllers ? AuthModuleWithoutCcontrollers : module,
      controllers: normalizedOptions.disableControllers ? [] : forRootResult.controllers,
      providers: [
        ...(forRootResult.providers ?? []),
        ...(!normalizedOptions.disableGlobalAuthGuard
          ? [
              {
                provide: APP_GUARD,
                useClass: AuthGuard
              }
            ]
          : [])
      ]
    }
  }
}

class AuthModuleWithoutCcontrollers extends AuthModule {
  override configure(): void {
    return
  }
}
