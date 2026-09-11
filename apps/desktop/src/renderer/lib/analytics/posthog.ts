import type { AnalyticsDesktopAdapter } from '@libs/analytics'

import posthog from 'posthog-js'

import { desktopEnv } from '@libs/analytics-web/env'

const key = desktopEnv.VITE_POSTHOG_KEY
const host = desktopEnv.VITE_POSTHOG_HOST

if (key && !posthog.__loaded) {
  posthog.init(key, {
    api_host: host,
    person_profiles: 'always',
    capture_pageview: false,
    disable_external_dependency_loading: true,
    disable_session_recording: true
  })
}

export const posthogDesktopAnalyticsAdapter: AnalyticsDesktopAdapter = {
  track: (event, data) => {
    if (!key) return
    posthog.capture(event, data)
  },
  identify: (userId, traits) => {
    if (!key) return
    posthog.identify(userId, traits)
  },
  reset: () => {
    if (!key) return
    posthog.reset()
  }
}
