import { Injectable, ServiceUnavailableException } from '@nestjs/common'

import { auth } from '@libs/auth-server'
import { PrismaService } from '@libs/pg-dao'
import { RedisService } from '@libs/server-redis'

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  getData(): { service: string; status: string } {
    return {
      service: 'pulse',
      status: 'ok'
    }
  }

  async getReadiness(): Promise<{
    service: string
    status: string
    dependencies: Record<string, string>
    supportedEnvelopeVersions: number[]
  }> {
    try {
      await Promise.all([this.prisma.$queryRaw`SELECT 1`, this.redis.client.ping()])

      if (typeof auth.api.getSession !== 'function') {
        throw new Error('Better Auth session API is unavailable')
      }

      return {
        service: 'pulse',
        status: 'ready',
        dependencies: { postgres: 'ready', redis: 'ready', auth: 'ready' },
        supportedEnvelopeVersions: [1]
      }
    } catch (error) {
      throw new ServiceUnavailableException({
        service: 'pulse',
        status: 'not-ready',
        reason: error instanceof Error ? error.message : 'dependency check failed'
      })
    }
  }
}
