import type { BrowserWindow, IpcMainInvokeEvent } from 'electron'

import { describe, expect, it, vi } from 'vitest'

import { isTrustedUpdateSender, registerUpdateHandlers } from './ipc'
import { UpdateService } from './service'

const handlers = vi.hoisted(() => new Map<string, (event: unknown, ...args: unknown[]) => unknown>())
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, fn: (event: unknown) => unknown) => {
      if (handlers.has(channel)) throw new Error('Duplicate handler')
      handlers.set(channel, fn)
    },
    removeHandler: (channel: string) => handlers.delete(channel)
  }
}))

describe('update IPC boundary', () => {
  it('rejects foreign windows, subframes and different documents; permits hash navigation', () => {
    const frame = { url: 'file:///app/index.html#/auth/login' }
    const contents = { mainFrame: frame }
    const window = { isDestroyed: () => false, webContents: contents } as unknown as BrowserWindow
    const event = { sender: contents, senderFrame: frame } as unknown as IpcMainInvokeEvent
    expect(isTrustedUpdateSender(event, window, 'file:///app/index.html')).toBe(true)
    expect(
      isTrustedUpdateSender({ ...event, sender: {} } as IpcMainInvokeEvent, window, 'file:///app/index.html')
    ).toBe(false)
    expect(
      isTrustedUpdateSender({ ...event, senderFrame: {} } as IpcMainInvokeEvent, window, 'file:///app/index.html')
    ).toBe(false)
    frame.url = 'file:///other/index.html'
    expect(isTrustedUpdateSender(event, window, 'file:///app/index.html')).toBe(false)
  })
  it('cleans up on close and supports recreating the window without duplicate handlers', () => {
    let closed: () => void = () => undefined
    const contents = { mainFrame: { url: 'file:///app/index.html' }, send: vi.fn(), isDestroyed: () => false }
    const window = {
      isDestroyed: () => false,
      webContents: contents,
      once: (_: string, cb: () => void) => {
        closed = cb
      }
    } as unknown as BrowserWindow
    const service = new UpdateService(
      { check: async () => null, download: async () => null, install: () => undefined, listen: () => () => undefined },
      '1.0.0',
      true
    )
    registerUpdateHandlers(window, service, 'file:///app/index.html')
    const event = { sender: contents, senderFrame: contents.mainFrame }
    expect(() => handlers.get('updates:check')?.(event, 'https://attacker.test')).toThrow('Invalid update request')
    closed()
    expect(handlers.size).toBe(0)
    registerUpdateHandlers(window, service, 'file:///app/index.html')
    expect(handlers.size).toBe(4)
    closed()
    service.dispose()
  })
})
