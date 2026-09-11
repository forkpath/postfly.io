import type { MonitoringServerStrategy } from '@libs/monitoring'

import { PostHog } from 'posthog-node'

import { serverEnv } from '../../env'

let client: PostHog | null = null

function getClient() {
  if (client) {
    return client
  }

  if (!serverEnv.POSTHOG_KEY) {
    return null
  }

  client = new PostHog(serverEnv.POSTHOG_KEY, {
    host: serverEnv.POSTHOG_HOST,
    flushAt: 1,
    flushInterval: 0
  })

  return client
}

export const posthogMonitoringServerStrategy = {
  captureException: (error, extra) => {
    const analytics = getClient()

    if (!analytics) {
      return
    }

    const distinctId = typeof extra?.['id'] === 'string' ? extra['id'] : undefined

    analytics.captureException(error, distinctId)
  },
  initialize: () => {
    getClient()
  }
} satisfies MonitoringServerStrategy
