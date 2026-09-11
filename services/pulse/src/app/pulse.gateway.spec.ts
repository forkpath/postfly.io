import { EventEmitter } from 'node:events'
import type { IncomingMessage } from 'node:http'
import type { WebSocket } from 'ws'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PulseGateway } from './pulse.gateway'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))

vi.mock('@libs/auth-server', () => ({
  auth: { api: { getSession } }
}))

class FakeSocket extends EventEmitter {
  readyState = 1
  bufferedAmount = 0
  close = vi.fn()
  send = vi.fn()
  ping = vi.fn()
  terminate = vi.fn()
}

function request(): IncomingMessage {
  return {
    headers: {},
    socket: { remoteAddress: '127.0.0.1' }
  } as unknown as IncomingMessage
}

function session() {
  return {
    user: { id: 'user-1' },
    session: { expiresAt: new Date(Date.now() + 60_000) }
  }
}

describe('PulseGateway authorization', () => {
  const redis = {
    client: {
      incr: vi.fn().mockResolvedValue(1),
      expire: vi.fn().mockResolvedValue(1),
      publish: vi.fn().mockResolvedValue(1)
    }
  }
  const prisma = {
    member: { findUnique: vi.fn() }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    redis.client.incr.mockResolvedValue(1)
    prisma.member.findUnique.mockResolvedValue(null)
  })

  it('rejects an unauthenticated connection', async () => {
    getSession.mockResolvedValue(null)
    const socket = new FakeSocket()
    const gateway = new PulseGateway(prisma as never, redis as never)

    await gateway.handleConnection(socket as unknown as WebSocket, request())

    expect(socket.close).toHaveBeenCalledWith(4401, 'authentication required')
  })

  it('rejects new sockets while draining and resumes for rollback', async () => {
    getSession.mockResolvedValue(session())
    const gateway = new PulseGateway(prisma as never, redis as never)
    const drainingSocket = new FakeSocket()

    gateway.beginDrain()
    await gateway.handleConnection(drainingSocket as unknown as WebSocket, request())
    expect(drainingSocket.close).toHaveBeenCalledWith(1012, 'service draining')
    expect(getSession).not.toHaveBeenCalled()

    gateway.resumeTraffic()
    const resumedSocket = new FakeSocket()
    await gateway.handleConnection(resumedSocket as unknown as WebSocket, request())
    expect(resumedSocket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'connected', envelopeVersions: [1] }))
  })

  it('rejects a cross-organization subscription', async () => {
    getSession.mockResolvedValue(session())
    const socket = new FakeSocket()
    const gateway = new PulseGateway(prisma as never, redis as never)
    await gateway.handleConnection(socket as unknown as WebSocket, request())

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'subscribe', organizationId: 'org-2' })))

    await vi.waitFor(() => {
      expect(socket.close).toHaveBeenCalledWith(4403, 'organization access denied')
    })
  })

  it('allows an authenticated member to subscribe', async () => {
    getSession.mockResolvedValue(session())
    prisma.member.findUnique.mockResolvedValue({ id: 'member-1' })
    const socket = new FakeSocket()
    const gateway = new PulseGateway(prisma as never, redis as never)
    await gateway.handleConnection(socket as unknown as WebSocket, request())

    socket.emit('message', Buffer.from(JSON.stringify({ type: 'subscribe', organizationId: 'org-1' })))

    await vi.waitFor(() => {
      expect(socket.send).toHaveBeenCalledWith(JSON.stringify({ type: 'subscribed', organizationId: 'org-1' }))
    })
  })
})
