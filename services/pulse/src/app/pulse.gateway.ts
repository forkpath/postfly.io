import type { IncomingMessage } from 'node:http'

import { Logger, OnApplicationShutdown, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer as WebSocketServerDecorator } from '@nestjs/websockets'

import { fromNodeHeaders } from 'better-auth/node'
import { WebSocket } from 'ws'

import { auth } from '@libs/auth-server'
import { PrismaService } from '@libs/pg-dao'
import { EventEnvelopeV1, PLATFORM_SMOKE_EVENT, PlatformSmokePayload } from '@libs/platform-contract'
import { RedisService } from '@libs/server-redis'

interface PulseMessage {
  type: 'subscribe' | 'unsubscribe' | typeof PLATFORM_SMOKE_EVENT
  organizationId?: string
  payload?: PlatformSmokePayload
}

interface ConnectionContext {
  userId: string
  expiresAt: number
  organizations: Set<string>
  alive: boolean
}

const CHANNEL = 'pulse:organization-events:v1'
const MAX_BUFFERED_BYTES = 1024 * 1024
const MAX_CONNECTIONS_PER_MINUTE = 30

@WebSocketGateway({ path: '/ws', maxPayload: 64 * 1024 })
export class PulseGateway implements OnApplicationShutdown, OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(PulseGateway.name)
  private readonly contexts = new Map<WebSocket, ConnectionContext>()
  private heartbeat?: NodeJS.Timeout
  private draining = false

  @WebSocketServerDecorator()
  private server?: import('ws').WebSocketServer

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService
  ) {}

  async onModuleInit() {
    const subscriber = this.redis.subClient
    await subscriber.subscribe(CHANNEL)
    subscriber.on('message', (channel, raw) => {
      if (channel === CHANNEL) this.deliver(raw)
    })

    this.heartbeat = setInterval(() => this.runHeartbeat(), 30_000)
    this.heartbeat.unref()
  }

  async handleConnection(client: WebSocket, request: IncomingMessage) {
    try {
      if (this.draining) {
        client.close(1012, 'service draining')
        return
      }

      const ip = request.socket.remoteAddress || 'unknown'
      const rateKey = `pulse:connect:${ip}:${Math.floor(Date.now() / 60_000)}`
      const connections = await this.redis.client.incr(rateKey)
      if (connections === 1) await this.redis.client.expire(rateKey, 120)
      if (connections > MAX_CONNECTIONS_PER_MINUTE) {
        client.close(4429, 'connection rate exceeded')
        return
      }

      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers)
      })
      if (!session) {
        client.close(4401, 'authentication required')
        return
      }

      const expiresAt = new Date(session.session.expiresAt).getTime()
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        client.close(4401, 'session expired')
        return
      }

      this.contexts.set(client, {
        userId: session.user.id,
        expiresAt,
        organizations: new Set(),
        alive: true
      })
      client.on('pong', () => {
        const context = this.contexts.get(client)
        if (context) context.alive = true
      })
      client.on('message', raw => void this.handleMessage(client, raw.toString()))
      client.on('close', () => this.contexts.delete(client))
      this.send(client, { type: 'connected', envelopeVersions: [1] })
    } catch (error) {
      this.logger.warn(`WebSocket authentication failed: ${this.errorMessage(error)}`)
      client.close(4401, 'authentication failed')
    }
  }

  private async handleMessage(client: WebSocket, raw: string) {
    const context = this.contexts.get(client)
    if (!context || context.expiresAt <= Date.now()) {
      client.close(4401, 'session expired')
      return
    }

    let message: PulseMessage
    try {
      message = JSON.parse(raw) as PulseMessage
    } catch {
      client.close(4400, 'invalid message')
      return
    }

    const organizationId = message.organizationId
    if (!organizationId || !(await this.isMember(organizationId, context.userId))) {
      client.close(4403, 'organization access denied')
      return
    }

    if (message.type === 'subscribe') {
      context.organizations.add(organizationId)
      this.send(client, { type: 'subscribed', organizationId })
      return
    }

    if (message.type === 'unsubscribe') {
      context.organizations.delete(organizationId)
      this.send(client, { type: 'unsubscribed', organizationId })
      return
    }

    if (message.type === PLATFORM_SMOKE_EVENT && process.env['PLATFORM_SMOKE_ENABLED'] === 'true') {
      const envelope: EventEnvelopeV1<PlatformSmokePayload> = {
        id: crypto.randomUUID(),
        type: PLATFORM_SMOKE_EVENT,
        version: 1,
        occurredAt: new Date().toISOString(),
        correlationId: crypto.randomUUID(),
        actor: { userId: context.userId, organizationId },
        payload: message.payload ?? { probeId: crypto.randomUUID() }
      }
      await this.redis.client.publish(CHANNEL, JSON.stringify(envelope))
      return
    }

    client.close(4400, 'unsupported message type')
  }

  private async isMember(organizationId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true }
    })
    return !!member
  }

  private deliver(raw: string) {
    let envelope: EventEnvelopeV1<unknown>
    try {
      envelope = JSON.parse(raw) as EventEnvelopeV1<unknown>
    } catch {
      return
    }
    const organizationId = envelope.actor.organizationId
    if (!organizationId || envelope.version !== 1) return

    for (const [client, context] of this.contexts) {
      if (context.organizations.has(organizationId)) this.send(client, envelope)
    }
  }

  private send(client: WebSocket, value: unknown) {
    if (client.readyState !== WebSocket.OPEN) return
    if (client.bufferedAmount > MAX_BUFFERED_BYTES) {
      client.close(4408, 'send buffer exceeded')
      return
    }
    client.send(JSON.stringify(value))
  }

  private runHeartbeat() {
    const now = Date.now()
    for (const [client, context] of this.contexts) {
      if (context.expiresAt <= now) {
        client.close(4401, 'session expired')
      } else if (!context.alive) {
        client.terminate()
      } else {
        context.alive = false
        client.ping()
      }
    }
  }

  onApplicationShutdown() {
    this.beginDrain()
    this.server?.close()
  }

  beginDrain(): void {
    this.draining = true
    for (const client of this.contexts.keys()) client.close(1012, 'service restart')
  }

  resumeTraffic(): void {
    this.draining = false
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat)
    await this.redis.subClient.unsubscribe(CHANNEL)
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }
}
