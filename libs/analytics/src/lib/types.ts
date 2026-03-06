import type { ReactNode } from 'react'

export type AllowedPropertyValues = string | number | boolean

export type AnalyticsProviderName = 'google-analytics' | 'posthog'

export type AnalyticsTrackPayload = Record<string, AllowedPropertyValues> & {
  clientId?: string
  distinctId?: string
}

export interface AnalyticsProviderClientStrategy {
  Provider: ({ children }: { children: ReactNode }) => ReactNode
  track: (event: string, data?: AnalyticsTrackPayload) => void
  identify: (userId: string, traits?: Record<string, AllowedPropertyValues>) => void
  reset: () => void
}

export interface AnalyticsProviderServerStrategy {
  track: (event: string, data?: AnalyticsTrackPayload) => void
}

export const AnalyticsProvider = {
  POSTHOG: 'posthog',
  GOOGLE_ANALYTICS: 'google-analytics'
} as const satisfies Record<string, AnalyticsProviderName>
