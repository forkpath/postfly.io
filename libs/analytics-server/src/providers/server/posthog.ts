import type { AnalyticsProviderServerStrategy } from '@libs/analytics'

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
    host: serverEnv.POSTHOG_HOST
  })

  return client
}

export const posthogServerStrategy = {
  track: (event, data) => {
    const analytics = getClient()

    if (!analytics) {
      return
    }

    analytics.capture({
      event,
      distinctId: typeof data?.distinctId === 'string' ? data.distinctId : 'anonymous',
      properties: data
    })
  }
} satisfies AnalyticsProviderServerStrategy
