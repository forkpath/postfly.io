import { describe, expect, it, vi } from 'vitest'

import { PLATFORM_SMOKE_EVENT } from '@libs/platform-contract'

import { retryDelayMs } from './platform-event.consumer'
import { PlatformHandlerRegistry } from './platform-handler.registry'

// Importing the consumer for retryDelayMs must not initialize a database client.
vi.mock('@libs/pg-dao', () => ({ PrismaService: class {} }))

describe('Worker platform contracts', () => {
  it('registers only the explicit smoke envelope version', () => {
    const registry = new PlatformHandlerRegistry()
    expect(registry.resolve(PLATFORM_SMOKE_EVENT, 1)).toBeDefined()
    expect(registry.resolve(PLATFORM_SMOKE_EVENT, 2)).toBeUndefined()
    expect(registry.resolve('product.event', 1)).toBeUndefined()
  })

  it('caps exponential retry delay and applies bounded jitter', () => {
    expect(retryDelayMs(1, () => 0)).toBe(4000)
    expect(retryDelayMs(1, () => 1)).toBe(6000)
    expect(retryDelayMs(20, () => 0.5)).toBe(300000)
  })
})
