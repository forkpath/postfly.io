import { afterEach, expect, it, vi } from 'vitest'

import { clearMobileMonitoringAdapters, MonitoringProvider, registerMobileMonitoringAdapter } from '@libs/monitoring'

afterEach(() => {
  clearMobileMonitoringAdapters()
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('reads Expo configuration and preserves native monitoring registration', async () => {
  vi.stubEnv('EXPO_PUBLIC_MONITORING_PROVIDER', 'sentry')
  vi.stubEnv('EXPO_PUBLIC_SENTRY_DSN', 'native-test-dsn')
  vi.stubEnv('MONITORING_PROVIDER', 'invalid-server-value')
  const adapter = { initialize: vi.fn(), identify: vi.fn(), captureException: vi.fn() }
  registerMobileMonitoringAdapter(MonitoringProvider.SENTRY, adapter)
  const { mobileEnv } = await import('./env')
  const native = await import('./index')
  expect(mobileEnv.EXPO_PUBLIC_SENTRY_DSN).toBe('native-test-dsn')
  expect(Object.keys(mobileEnv).every(key => key.startsWith('EXPO_PUBLIC_'))).toBe(true)
  const error = new Error('native failure')
  native.initialize()
  native.identify({ id: 'u1' })
  native.captureException(error, { task: 'test' })
  expect(adapter.captureException).toHaveBeenCalledWith(error, { task: 'test' })
  expect(adapter.identify).toHaveBeenCalledWith({ id: 'u1' })
  expect(adapter.initialize).toHaveBeenCalledOnce()
})
