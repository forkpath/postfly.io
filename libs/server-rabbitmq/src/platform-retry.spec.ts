import { describe, expect, it } from 'vitest'

import { platformRetryQueue } from './platform-retry'

describe('platform retry timing', () => {
  it('rounds up without dispatching earlier than the requested backoff', () => {
    expect(platformRetryQueue(4000)).toEqual({ name: 'platform.smoke.retry.5000', delayMs: 5000 })
    expect(platformRetryQueue(5000).delayMs).toBe(5000)
    expect(platformRetryQueue(6000).delayMs).toBe(10000)
    expect(platformRetryQueue(360000).delayMs).toBe(360000)
  })

  it('separates a short retry from a long active lease', () => {
    expect(platformRetryQueue(5000).name).not.toBe(platformRetryQueue(30000).name)
  })

  it('rejects unsupported delays instead of silently retrying too early', () => {
    for (const delay of [0, -1, NaN, Infinity, 360001]) expect(() => platformRetryQueue(delay)).toThrow(RangeError)
  })
})
