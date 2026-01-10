import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'

import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(databaseUrl: string) {
    const adapter = new PrismaPg({ connectionString: databaseUrl })
    super({ adapter })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
