import { randomUUID } from 'node:crypto'
import type { AnalyticsProviderServerStrategy, AnalyticsTrackPayload } from '@libs/analytics'

import { serverEnv } from '../../env'

async function postEvent(event: string, data?: AnalyticsTrackPayload) {
  if (!serverEnv.GOOGLE_ANALYTICS_MEASUREMENT_ID || !serverEnv.GOOGLE_ANALYTICS_SECRET) {
    return
  }

  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${serverEnv.GOOGLE_ANALYTICS_MEASUREMENT_ID}&api_secret=${serverEnv.GOOGLE_ANALYTICS_SECRET}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client_id: typeof data?.clientId === 'string' ? data.clientId : randomUUID(),
        events: [{ name: event, params: data }]
      })
    }
  )

  if (!response.ok) {
    console.error('Failed to post event to Google Analytics', response.status, response.statusText)
  }
}

export const googleAnalyticsServerStrategy = {
  track: (event, data) => {
    void postEvent(event, data)
  }
} satisfies AnalyticsProviderServerStrategy
