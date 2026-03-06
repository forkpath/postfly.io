import type { ReactNode } from 'react'

import { describe, expect, it } from 'vitest'

import { normalizeMonitoringProvider, selectMonitoringClientStrategy, selectMonitoringServerStrategy } from './provider'
import { MonitoringProvider } from './types'

describe('monitoring provider helpers', () => {
  it('defaults to posthog when provider is missing', () => {
    expect(normalizeMonitoringProvider(undefined)).toBe(MonitoringProvider.POSTHOG)
  })

  it('selects the sentry client strategy when configured', () => {
    const sentryStrategy = {
      Provider: ({ children }: { children: ReactNode }) => children,
      captureException: () => undefined,
      identify: () => undefined,
      initialize: () => undefined
    }

    const strategy = selectMonitoringClientStrategy(MonitoringProvider.SENTRY, {
      [MonitoringProvider.SENTRY]: sentryStrategy
    })

    expect(strategy).toBe(sentryStrategy)
  })

  it('falls back to a no-op server strategy when provider is unknown', () => {
    const strategy = selectMonitoringServerStrategy('unknown-provider', {})

    expect(() => strategy.captureException(new Error('test'))).not.toThrow()
  })
})
