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
    claim: vi.fn().mockResolvedValue(true),
    complete: vi.fn().mockResolvedValue(undefined),
    fail: vi.fn().mockResolvedValue(undefined)
  }
  const handler = vi.fn().mockResolvedValue(undefined)
  const registry = { resolve: vi.fn().mockReturnValue(handler) }

  beforeEach(() => {
    vi.clearAllMocks()
    inbox.claim.mockResolvedValue(true)
    handler.mockResolvedValue(undefined)
    registry.resolve.mockReturnValue(handler)
  })

  it('acks a duplicate without executing side effects', async () => {
    inbox.claim.mockResolvedValue(false)
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, {})

    expect(handler).not.toHaveBeenCalled()
    expect(inbox.complete).not.toHaveBeenCalled()
  })

  it('completes the inbox record only after handler success', async () => {
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, {})

    expect(handler).toHaveBeenCalledWith(envelope)
    expect(inbox.complete).toHaveBeenCalledWith('worker.platform.v1', envelope.id)
  })

  it('schedules a persistent retry after a handler failure', async () => {
    handler.mockRejectedValue(new Error('temporary'))
    const consumer = new PlatformEventConsumer(amqp as never, inbox as never, registry as never)

    await consumer.consume(envelope, { properties: { headers: { 'x-attempt': 1 } } })

    expect(inbox.fail).toHaveBeenCalledWith('worker.platform.v1', envelope.id, 'temporary', true)
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

    expect(inbox.fail).toHaveBeenCalledWith('worker.platform.v1', envelope.id, 'permanent', false)
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
