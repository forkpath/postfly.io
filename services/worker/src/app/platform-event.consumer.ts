import { Injectable, Logger } from '@nestjs/common'

import { AmqpConnection, Nack, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq'

import {
  EventEnvelopeV1,
  isEventEnvelopeV1,
  PLATFORM_EVENT_DLX,
  PLATFORM_EVENT_EXCHANGE,
  PLATFORM_SMOKE_EVENT
} from '@libs/platform-contract'

import { InboxService } from './inbox.service'
import { PlatformHandlerRegistry } from './platform-handler.registry'

interface RawMessage {
  properties?: {
    headers?: Record<string, unknown>
    correlationId?: string
    messageId?: string
  }
}

const CONSUMER = 'worker.platform.v1'
const MAX_ATTEMPTS = 5

export function retryDelayMs(attempt: number, random = Math.random): number {
  const base = Math.min(300_000, 5_000 * 2 ** Math.max(0, attempt - 1))
  return Math.round(base * (0.8 + random() * 0.4))
}

@Injectable()
export class PlatformEventConsumer {
  private readonly logger = new Logger(PlatformEventConsumer.name)

  constructor(
    private readonly amqp: AmqpConnection,
    private readonly inbox: InboxService,
    private readonly registry: PlatformHandlerRegistry
  ) {}

  @RabbitSubscribe({
    exchange: PLATFORM_EVENT_EXCHANGE,
    routingKey: PLATFORM_SMOKE_EVENT,
    queue: 'platform.smoke',
    queueOptions: {
      durable: true,
      deadLetterExchange: PLATFORM_EVENT_DLX,
      deadLetterRoutingKey: PLATFORM_SMOKE_EVENT
    }
  })
  async consume(value: unknown, raw: RawMessage): Promise<Nack | void> {
    if (!isEventEnvelopeV1(value)) {
      await this.deadLetter(value, 'unsupported-or-invalid-envelope', raw)
      return
    }

    const envelope = value as EventEnvelopeV1<unknown>
    const handler = this.registry.resolve(envelope.type, envelope.version)
    if (!handler) {
      await this.deadLetter(envelope, 'handler-version-not-supported', raw)
      return
    }

    const claimed = await this.inbox.claim({
      consumer: CONSUMER,
      messageId: envelope.id,
      eventType: envelope.type,
      version: envelope.version
    })
    if (!claimed) {
      this.logger.debug(`Duplicate or active message ignored: ${envelope.id}`)
      return
    }

    const attempt = this.attempt(raw)
    try {
      await handler(envelope)
      await this.inbox.complete(CONSUMER, envelope.id)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      if (attempt >= MAX_ATTEMPTS) {
        await this.inbox.fail(CONSUMER, envelope.id, reason, false)
        await this.deadLetter(envelope, reason, raw)
        return
      }

      await this.inbox.fail(CONSUMER, envelope.id, reason, true)
      await this.retry(envelope, attempt + 1, raw)
    }
  }

  private attempt(raw: RawMessage): number {
    const candidate = Number(raw.properties?.headers?.['x-attempt'] ?? 1)
    return Number.isInteger(candidate) && candidate > 0 ? candidate : 1
  }

  private async retry(envelope: EventEnvelopeV1<unknown>, attempt: number, raw: RawMessage) {
    const delay = retryDelayMs(attempt - 1)
    await this.amqp.managedChannel.sendToQueue('platform.smoke.retry', Buffer.from(JSON.stringify(envelope)), {
      persistent: true,
      expiration: String(delay),
      contentType: 'application/json',
      messageId: envelope.id,
      correlationId: raw.properties?.correlationId ?? envelope.correlationId,
      headers: { 'x-attempt': attempt, 'x-retry-delay-ms': delay }
    } as never)
    this.logger.warn(`Message ${envelope.id} scheduled for attempt ${attempt} in ${delay}ms`)
  }

  private async deadLetter(value: unknown, reason: string, raw: RawMessage) {
    await this.amqp.publish(PLATFORM_EVENT_DLX, PLATFORM_SMOKE_EVENT, value, {
      persistent: true,
      messageId: raw.properties?.messageId,
      correlationId: raw.properties?.correlationId,
      headers: { ...raw.properties?.headers, 'x-dead-letter-reason': reason }
    })
    this.logger.error(`Message moved to DLQ: ${reason}`)
  }
}
