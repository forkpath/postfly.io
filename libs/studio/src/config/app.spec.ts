import { afterEach, describe, expect, it, vi } from 'vitest'

import { appConfig } from './app'

afterEach(() => vi.unstubAllGlobals())

describe('the same Web artifact on different deployment origins', () => {
  it('creates links for the current staging or production gateway without rebuilding', () => {
    for (const origin of ['https://staging.example.invalid', 'https://example.invalid']) {
      vi.stubGlobal('window', { location: new URL(origin) })
      expect(new URL('/auth/join', appConfig.url).href).toBe(`${origin}/auth/join`)
    }
  })

  it('retains the canonical fallback for server rendering and file-based hosts', () => {
    vi.stubGlobal('window', undefined)
    const canonical = appConfig.url
    expect(new URL(canonical).protocol).toMatch(/^https?:$/)
    vi.stubGlobal('window', { location: new URL('file:///app/index.html') })
    expect(appConfig.url).toBe(canonical)
  })
})
