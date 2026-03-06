import type { ReactNode } from 'react'

export type MonitoringProviderName = 'posthog' | 'sentry'

export interface MonitoringIdentity {
  id: string
  email?: string
  name?: string
}

export interface MonitoringProviderStrategy {
  Provider: ({ children }: { children: ReactNode }) => ReactNode
  captureException: <Extra extends Record<string, unknown>>(error: unknown, extra?: Extra) => void
  identify: (info: MonitoringIdentity | null) => void
  initialize: () => void | Promise<void>
}

export type MonitoringServerStrategy = Omit<MonitoringProviderStrategy, 'Provider' | 'identify'>

export const MonitoringProvider = {
  POSTHOG: 'posthog',
  SENTRY: 'sentry'
} as const satisfies Record<string, MonitoringProviderName>
