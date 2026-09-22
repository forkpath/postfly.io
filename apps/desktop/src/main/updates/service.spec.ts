import type { UpdateEvents, UpdatePort } from './service'

import { describe, expect, it, vi } from 'vitest'

import { UpdateService } from './service'

function fixture(enabled = true) {
  let events: UpdateEvents
  const unlisten = vi.fn()
  const port: UpdatePort = {
    check: vi.fn(async () => {
      events.available('0.2.0')
    }),
    download: vi.fn(async () => {
      events.progress(52)
      events.downloaded('0.2.0')
    }),
    install: vi.fn(),
    listen: callbacks => {
      events = callbacks
      return unlisten
    }
  }
  const service = new UpdateService(port, '0.1.0', enabled)
  return { service, port, unlisten, events: () => events }
}

describe('desktop updates', () => {
  it('coalesces checks and downloads, installs only after download and only once', async () => {
    const { service, port } = fixture()
    service.install()
    expect(port.install).not.toHaveBeenCalled()
    const a = service.check()
    expect(service.check()).toBe(a)
    expect((await a).status).toBe('available')
    service.install()
    expect(port.install).not.toHaveBeenCalled()
    const b = service.download()
    expect(service.download()).toBe(b)
    expect((await b).status).toBe('downloaded')
    await service.check()
    expect(port.check).toHaveBeenCalledTimes(1)
    service.install()
    service.install()
    expect(port.install).toHaveBeenCalledTimes(1)
  })
  it('exposes progress, unsubscribes and disposes updater listeners', async () => {
    const { service, unlisten } = fixture()
    const listener = vi.fn()
    const off = service.subscribe(listener)
    await service.check()
    await service.download()
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ percent: 52 }))
    off()
    const count = listener.mock.calls.length
    service.dispose()
    expect(unlisten).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledTimes(count)
  })
  it('does not call updater when disabled', async () => {
    const { service, port } = fixture(false)
    expect((await service.check()).status).toBe('unconfigured')
    await service.download()
    service.install()
    expect(port.check).not.toHaveBeenCalled()
    expect(port.download).not.toHaveBeenCalled()
    expect(port.install).not.toHaveBeenCalled()
  })
  it('recovers from check and download errors without exposing raw messages', async () => {
    const { service, port } = fixture()
    vi.mocked(port.check).mockRejectedValueOnce(new Error('secret URL'))
    expect(await service.check()).toEqual({
      currentVersion: '0.1.0',
      status: 'error',
      error: 'check-failed',
      version: undefined
    })
    await service.check()
    vi.mocked(port.download).mockRejectedValueOnce(new Error('offline'))
    expect((await service.download()).error).toBe('download-failed')
    expect((await service.download()).status).toBe('downloaded')
  })
  it('supports no-update responses and later rechecks', async () => {
    const { service, port, events } = fixture()
    vi.mocked(port.check).mockImplementationOnce(async () => {
      events().unavailable()
    })
    expect((await service.check()).status).toBe('not-available')
    expect((await service.check()).status).toBe('available')
  })
})
