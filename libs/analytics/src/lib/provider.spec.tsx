import type { ReactNode } from 'react'

import { describe, expect, it } from 'vitest'

import { normalizeAnalyticsProvider, selectClientStrategy, selectServerStrategy } from './provider'
import { AnalyticsProvider } from './types'

describe('analytics provider helpers', () => {
  it('defaults to posthog when provider is missing', () => {
    expect(normalizeAnalyticsProvider(undefined)).toBe(AnalyticsProvider.POSTHOG)
  })

  it('selects the google analytics client strategy when configured', () => {
    const googleStrategy = {
      Provider: ({ children }: { children: ReactNode }) => children,
      track: () => undefined,
      identify: () => undefined,
      reset: () => undefined
    }

    const strategy = selectClientStrategy(AnalyticsProvider.GOOGLE_ANALYTICS, {
      [AnalyticsProvider.GOOGLE_ANALYTICS]: googleStrategy
    })

    expect(strategy).toBe(googleStrategy)
  })

  it('falls back to a no-op server strategy when provider is missing', () => {
    const strategy = selectServerStrategy('unknown-provider', {})

    expect(() => strategy.track('test-event')).not.toThrow()
  })
})
