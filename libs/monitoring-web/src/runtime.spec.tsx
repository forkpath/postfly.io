import { afterEach, expect, it, vi } from 'vitest'

import {
  clearDesktopMonitoringAdapters,
  clearExtensionMonitoringAdapters,
  clearWebMonitoringAdapters,
  MonitoringProvider,
  registerDesktopMonitoringAdapter,
  registerExtensionMonitoringAdapter,
  registerWebMonitoringAdapter
} from '@libs/monitoring'

vi.mock('posthog-js', () => ({
  default: { init: vi.fn(), captureException: vi.fn(), identify: vi.fn(), reset: vi.fn() }
}))
afterEach(() => {
  clearWebMonitoringAdapters()
  clearDesktopMonitoringAdapters()
  clearExtensionMonitoringAdapters()
  vi.unstubAllEnvs()
})

it('preserves independent Sentry adapters for Web, desktop renderer and extension', async () => {
  vi.stubEnv('MONITORING_PROVIDER', 'invalid-server-provider')
  vi.stubEnv('VITE_MONITORING_PROVIDER', 'sentry')
  const web = { initialize: vi.fn(), identify: vi.fn(), captureException: vi.fn() }
  const desktop = { initialize: vi.fn(), identify: vi.fn(), captureException: vi.fn() }
  const extension = { initialize: vi.fn(), identify: vi.fn(), captureException: vi.fn() }
  registerWebMonitoringAdapter(MonitoringProvider.SENTRY, web)
  registerDesktopMonitoringAdapter(MonitoringProvider.SENTRY, desktop)
  registerExtensionMonitoringAdapter(MonitoringProvider.SENTRY, extension)
  const w = await import('./index')
  const d = await import('./desktop')
  const e = await import('./extension')
  const error = new Error('web failure')
  w.captureException(error)
  d.initialize()
  e.identify({ id: 'extension-user' })
  expect(web.captureException).toHaveBeenCalledWith(error, undefined)
  expect(desktop.initialize).toHaveBeenCalledOnce()
  expect(extension.identify).toHaveBeenCalledWith({ id: 'extension-user' })
  const { webEnv } = await import('./env')
  expect(Object.keys(webEnv).every(key => key.startsWith('VITE_'))).toBe(true)
})
