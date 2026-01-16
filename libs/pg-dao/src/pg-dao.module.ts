import { DynamicModule, Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { prisma } from './prisma'
// 使用方式：
// 1) 在应用模块中注册：
//    @Module({
//      imports: [PgDaoModule.register()]
//    })
//    export class AppModule {}
//
// 2) 在服务中注入 PrismaService（实际为 prisma.ts 单例）：
//    @Injectable()
//    export class UserService {
//      constructor(private readonly prisma: PrismaService) {}
//
//      async listUsers() {
//        return this.prisma.user.findMany()
//      }
//    }
//
// 对外暴露：
// - PrismaService（Nest 注入 token，实例为 prisma.ts 单例）
// - prisma（可在非 Nest 场景直接导入使用）
import { PrismaService } from './prisma.service'

@Global()
@Module({})
export class PgDaoModule implements OnModuleInit, OnModuleDestroy {
  static register(): DynamicModule {
    return {
      module: PgDaoModule,
      providers: [
        {
          provide: PrismaService,
          useValue: prisma
        }
      ],
      exports: [PrismaService]
    }
  }

  async onModuleInit() {
    await prisma.$connect()
  }

  async onModuleDestroy() {
    await prisma.$disconnect()
  }
}
