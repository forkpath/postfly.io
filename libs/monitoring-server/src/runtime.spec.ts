import { afterEach, expect, it, vi } from 'vitest'

import { clearServerMonitoringAdapters, MonitoringProvider, registerServerMonitoringAdapter } from '@libs/monitoring'

const capture = vi.hoisted(() => vi.fn())
vi.mock('posthog-node', () => ({
  PostHog: class {
    captureException = capture
  }
}))
afterEach(() => {
  clearServerMonitoringAdapters()
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

it('preserves Sentry registration and ignores invalid browser settings', async () => {
  vi.stubEnv('MONITORING_PROVIDER', 'sentry')
  vi.stubEnv('VITE_MONITORING_PROVIDER', 'invalid-web-provider')
  const adapter = { initialize: vi.fn(), captureException: vi.fn() }
  registerServerMonitoringAdapter(MonitoringProvider.SENTRY, adapter)
  const server = await import('./index')
  const error = new Error('server failure')
  server.initialize()
  server.captureException(error, { correlationId: 'c1' })
  expect(adapter.initialize).toHaveBeenCalledOnce()
  expect(adapter.captureException).toHaveBeenCalledWith(error, { correlationId: 'c1' })
})
