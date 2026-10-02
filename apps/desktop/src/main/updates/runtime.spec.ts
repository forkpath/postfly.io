import { afterEach, describe, expect, it, vi } from 'vitest'

import { createUpdateService } from './runtime'

const mock = vi.hoisted(() => ({
  packaged: true,
  configured: true,
  updater: {
    checkForUpdates: vi.fn(async () => null),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
    autoDownload: true,
    autoInstallOnAppQuit: true,
    allowDowngrade: true,
    allowPrerelease: true
  }
}))
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mock.packaged
    },
    getAppPath: () => '/app',
    getVersion: () => '0.1.0'
  }
}))
vi.mock('node:fs', () => ({ readFileSync: () => JSON.stringify({ desktopUpdatesEnabled: mock.configured }) }))
vi.mock('electron-updater', () => ({ default: { autoUpdater: mock.updater } }))
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  mock.packaged = true
  mock.configured = true
})

describe('packaged updater lifecycle', () => {
  it.each([
    [false, true],
    [true, false]
  ])('does not schedule updates: packaged=%s configured=%s', (packaged, configured) => {
    vi.useFakeTimers()
    mock.packaged = packaged
    mock.configured = configured
    const runtime = createUpdateService()
    runtime.start()
    expect(runtime.service.getState().status).toBe('unconfigured')
    expect(vi.getTimerCount()).toBe(0)
    runtime.dispose()
  })
  it('schedules once across window recreation and disposes all timers/listeners', async () => {
    vi.useFakeTimers()
    const runtime = createUpdateService()
    runtime.start()
    runtime.start()
    expect(mock.updater.autoDownload).toBe(false)
    expect(mock.updater.autoInstallOnAppQuit).toBe(false)
    expect(mock.updater.allowDowngrade).toBe(false)
    expect(mock.updater.allowPrerelease).toBe(false)
    await vi.advanceTimersByTimeAsync(9999)
    expect(mock.updater.checkForUpdates).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000)
    expect(mock.updater.checkForUpdates).toHaveBeenCalledTimes(2)
    runtime.dispose()
    expect(vi.getTimerCount()).toBe(0)
    expect(mock.updater.removeListener).toHaveBeenCalledTimes(5)
  })
})
