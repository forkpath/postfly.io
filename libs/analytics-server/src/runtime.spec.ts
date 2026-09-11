import { afterEach, expect, it, vi } from 'vitest'

const capture = vi.hoisted(() => vi.fn())
vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = capture
  }
}))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.clearAllMocks()
})

it('dispatches server PostHog events without evaluating client configuration', async () => {
  vi.stubEnv('ANALYTICS_PROVIDER', 'posthog')
  vi.stubEnv('POSTHOG_KEY', 'test-key')
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'invalid-web-provider')
  const { track } = await import('./index')
  track('server-event', { distinctId: 'u1', value: 3 })
  expect(capture).toHaveBeenCalledWith({
    event: 'server-event',
    distinctId: 'u1',
    properties: { distinctId: 'u1', value: 3 }
  })
})

it('uses the server measurement ID and retains the legacy public-ID fallback', async () => {
  vi.stubEnv('ANALYTICS_PROVIDER', 'google-analytics')
  vi.stubEnv('GOOGLE_ANALYTICS_SECRET', 'test-secret')
  vi.stubEnv('GOOGLE_ANALYTICS_MEASUREMENT_ID', undefined)
  vi.stubEnv('VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID', 'G-LEGACY')
  const fetchMock = vi.fn().mockResolvedValue({ ok: true })
  vi.stubGlobal('fetch', fetchMock)
  const { track } = await import('./index')
  track('purchase', { clientId: 'client-1', value: 1 })
  expect(fetchMock.mock.calls[0][0]).toContain('measurement_id=G-LEGACY')
  expect(JSON.parse(fetchMock.mock.calls[0][1].body).client_id).toBe('client-1')
})
