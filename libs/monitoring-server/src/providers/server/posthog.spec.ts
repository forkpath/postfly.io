import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => ({ construct: vi.fn(), capture: vi.fn() }))
vi.mock('posthog-node', () => ({
  PostHog: class {
    constructor(key: string, options: unknown) {
      sdk.construct(key, options)
    }
    captureException = sdk.capture
  }
}))

describe('server monitoring PostHog adapter', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })
  afterEach(() => vi.unstubAllEnvs())

  it('remains inert without an explicitly configured server key', async () => {
    vi.stubEnv('POSTHOG_KEY', '')
    const { posthogMonitoringServerStrategy: adapter } = await import('./posthog')
    adapter.initialize()
    adapter.captureException(new Error('test'), undefined)
    expect(sdk.construct).not.toHaveBeenCalled()
    expect(sdk.capture).not.toHaveBeenCalled()
  })

  it('reuses its SDK client and only forwards string distinct IDs', async () => {
    vi.stubEnv('POSTHOG_KEY', 'phc_test_only')
    vi.stubEnv('POSTHOG_HOST', 'https://monitoring.example.invalid')
    const { posthogMonitoringServerStrategy: adapter } = await import('./posthog')
    const error = new Error('test')
    adapter.initialize()
    adapter.captureException(error, { id: 'user' })
    adapter.captureException(error, { id: 42 })
    expect(sdk.construct).toHaveBeenCalledExactlyOnceWith('phc_test_only', {
      host: 'https://monitoring.example.invalid',
      flushAt: 1,
      flushInterval: 0
    })
    expect(sdk.capture).toHaveBeenNthCalledWith(1, error, 'user')
    expect(sdk.capture).toHaveBeenNthCalledWith(2, error, undefined)
  })
})
