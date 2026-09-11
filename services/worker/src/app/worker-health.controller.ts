import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'

import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'

import { PrismaService } from '@libs/pg-dao'

import { PlatformHandlerRegistry } from './platform-handler.registry'

@Controller()
export class WorkerHealthController {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly prisma: PrismaService,
    private readonly registry: PlatformHandlerRegistry
  ) {}

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      if (!this.amqp.connected) throw new Error('RabbitMQ is disconnected')
      const registry = this.registry.readiness()
      if (registry.types.length === 0) throw new Error('handler registry is empty')

      return {
        service: 'worker',
        status: 'ready',
        dependencies: { postgres: 'ready', rabbitmq: 'ready' },
        handlerRegistry: registry
      }
    } catch (error) {
      throw new ServiceUnavailableException({
        service: 'worker',
        status: 'not-ready',
        reason: error instanceof Error ? error.message : String(error)
      })
    }
  }
}
