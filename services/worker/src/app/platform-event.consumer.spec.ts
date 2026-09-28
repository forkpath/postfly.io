import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PLATFORM_EVENT_DLX, PLATFORM_SMOKE_EVENT } from '@libs/platform-contract'

import { PlatformEventConsumer } from './platform-event.consumer'

const envelope = {
  id: 'message-1',
  type: PLATFORM_SMOKE_EVENT,
  version: 1 as const,
  occurredAt: '2026-08-08T00:00:00.000Z',
  correlationId: 'correlation-1',
  actor: { userId: 'user-1' },
  payload: { probeId: 'probe-1' }
}

describe('PlatformEventConsumer delivery semantics', () => {
  const sendToQueue = vi.fn().mockResolvedValue(true)
  const publish = vi.fn().mockResolvedValue(true)
  const amqp = { managedChannel: { sendToQueue }, publish }
  const inbox = {
    claim: vi.fn().mockResolvedValue(1),
    retryAfter: vi.fn().mockResolvedValue(undefined),
    complete: vi.fn().mockResolvedValue(true),
    fail: vi.fn().mockResolvedValue(true)
  }
  const handler = vi.fn().mockResolvedValue(undefined)
  const registry = { resolve: vi.fn().mockReturnValue(handler) }

  beforeEach(() => {
    vi.clearAllMocks()
    inbox.claim.mockResolvedValue(1)
    inbox.retryAfter.mockResolvedValue(undefined)
    handler.mockResolvedValue(undefined)
    registry.resolve.mockReturnValue(handler)
  })

  it('acks a duplicate without executing side effects', async () => {
    inbox.claim.mockResolvedValue(undefined)
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, {})

    expect(handler).not.toHaveBeenCalled()
    expect(inbox.complete).not.toHaveBeenCalled()
  })

  it('propagates a failed delayed handoff so RabbitMQ can requeue the active lease delivery', async () => {
    inbox.claim.mockResolvedValue(undefined)
    inbox.retryAfter.mockResolvedValue(2000)
    sendToQueue.mockRejectedValueOnce(new Error('broker unavailable'))
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)
    await expect(consumer.consume(envelope, {})).rejects.toThrow('broker unavailable')
    expect(handler).not.toHaveBeenCalled()
  })

  it('completes the inbox record only after handler success', async () => {
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, {})

    expect(handler).toHaveBeenCalledWith(envelope)
    expect(inbox.complete).toHaveBeenCalledWith('worker.platform.v1', envelope.id, 1)
  })

  it('schedules a persistent retry after a handler failure', async () => {
    handler.mockRejectedValue(new Error('temporary'))
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, { properties: { headers: { 'x-attempt': 1 } } })

    expect(inbox.fail).toHaveBeenCalledWith('worker.platform.v1', envelope.id, 'temporary', true, 1)
    expect(sendToQueue).toHaveBeenCalledWith(
      'platform.smoke.retry',
      expect.any(Buffer),
      expect.objectContaining({ persistent: true, headers: expect.objectContaining({ 'x-attempt': 2 }) })
    )
  })

  it('moves an exhausted message to the DLQ', async () => {
    handler.mockRejectedValue(new Error('permanent'))
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, { properties: { headers: { 'x-attempt': 5 } } })

    expect(inbox.fail).toHaveBeenCalledWith('worker.platform.v1', envelope.id, 'permanent', false, 1)
    expect(publish).toHaveBeenCalledWith(
      PLATFORM_EVENT_DLX,
      PLATFORM_SMOKE_EVENT,
      envelope,
      expect.objectContaining({ headers: expect.objectContaining({ 'x-dead-letter-reason': 'permanent' }) })
    )
  })

  it('dead-letters unknown envelope versions without claiming the inbox', async () => {
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume({ ...envelope, version: 2 }, {})

    expect(inbox.claim).not.toHaveBeenCalled()
    expect(publish).toHaveBeenCalled()
  })
})
