import { afterEach, expect, it, vi } from 'vitest'

import { AnalyticsProvider, clearMobileAnalyticsAdapters, registerMobileAnalyticsAdapter } from '@libs/analytics'

afterEach(() => {
  clearMobileAnalyticsAdapters()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('uses only Expo configuration and dispatches through the registered native adapter', async () => {
  vi.stubEnv('EXPO_PUBLIC_ANALYTICS_PROVIDER', 'posthog')
  vi.stubEnv('EXPO_PUBLIC_POSTHOG_KEY', 'native-test-key')
  vi.stubEnv('ANALYTICS_PROVIDER', 'invalid-server-value')
  const adapter = { track: vi.fn(), identify: vi.fn(), reset: vi.fn() }
  registerMobileAnalyticsAdapter(AnalyticsProvider.POSTHOG, adapter)
  const { mobileEnv } = await import('./env')
  const native = await import('./index')
  expect(mobileEnv.EXPO_PUBLIC_POSTHOG_KEY).toBe('native-test-key')
  expect(Object.keys(mobileEnv).every(key => key.startsWith('EXPO_PUBLIC_'))).toBe(true)
  native.track('native-event', { count: 2 })
  native.identify('user-1')
  native.reset()
  expect(adapter.track).toHaveBeenCalledWith('native-event', { count: 2 })
  expect(adapter.identify).toHaveBeenCalledWith('user-1')
  expect(adapter.reset).toHaveBeenCalledOnce()
})
