import { afterEach, expect, it, vi } from 'vitest'

import {
  AnalyticsProvider,
  clearDesktopAnalyticsAdapters,
  clearExtensionAnalyticsAdapters,
  registerDesktopAnalyticsAdapter,
  registerExtensionAnalyticsAdapter
} from '@libs/analytics'

const sdk = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), identify: vi.fn(), reset: vi.fn(), __loaded: false }))
vi.mock('posthog-js', () => ({ default: sdk }))
vi.mock('@posthog/react', () => ({ PostHogProvider: ({ children }: { children: unknown }) => children }))
afterEach(() => {
  clearDesktopAnalyticsAdapters()
  clearExtensionAnalyticsAdapters()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  vi.resetModules()
})

it('keeps desktop and extension adapters independent without server env evaluation', async () => {
  vi.stubEnv('ANALYTICS_PROVIDER', 'invalid-server-provider')
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'posthog')
  const desktop = { track: vi.fn(), identify: vi.fn(), reset: vi.fn() }
  const extension = { track: vi.fn(), identify: vi.fn(), reset: vi.fn() }
  registerDesktopAnalyticsAdapter(AnalyticsProvider.POSTHOG, desktop)
  registerExtensionAnalyticsAdapter(AnalyticsProvider.POSTHOG, extension)
  const d = await import('./desktop')
  const e = await import('./extension')
  d.track('desktop')
  e.track('extension')
  expect(desktop.track).toHaveBeenCalledExactlyOnceWith('desktop')
  expect(extension.track).toHaveBeenCalledExactlyOnceWith('extension')
})

it('tracks configured Web events and exposes only public environment keys', async () => {
  vi.stubEnv('VITE_POSTHOG_KEY', 'public-test-key')
  vi.stubEnv('VITE_ANALYTICS_PROVIDER', 'posthog')
  vi.stubEnv('GOOGLE_ANALYTICS_SECRET', 'not-a-client-setting')
  vi.stubGlobal('window', {})
  const { webEnv } = await import('./env')
  const web = await import('./index')
  expect(Object.keys(webEnv).every(key => key.startsWith('VITE_'))).toBe(true)
  web.track('web-event', { value: 4 })
  web.identify('user-1')
  web.reset()
  expect(sdk.capture).toHaveBeenCalledWith('web-event', { value: 4 })
  expect(sdk.identify).toHaveBeenCalledWith('user-1', undefined)
  expect(sdk.reset).toHaveBeenCalledOnce()
})
