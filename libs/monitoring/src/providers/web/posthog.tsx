import type { MonitoringProviderStrategy } from '../../lib/types'

import posthog from 'posthog-js'

import { webEnv } from '../../env'

let initialized = false

export const posthogMonitoringStrategy = {
  Provider: ({ children }) => children,
  captureException: (error, extra) => {
    if (!webEnv.VITE_POSTHOG_KEY || typeof window === 'undefined') {
      return
    }

    posthog.captureException(error, extra)
  },
  identify: info => {
    if (!webEnv.VITE_POSTHOG_KEY || typeof window === 'undefined') {
      return
    }

    if (info) {
      posthog.identify(info.id, info)
      return
    }

    posthog.reset()
  },
  initialize: () => {
    if (initialized || !webEnv.VITE_POSTHOG_KEY || typeof window === 'undefined') {
      return
    }

    posthog.init(webEnv.VITE_POSTHOG_KEY, {
      api_host: webEnv.VITE_POSTHOG_HOST
    })
    initialized = true
  }
} satisfies MonitoringProviderStrategy
