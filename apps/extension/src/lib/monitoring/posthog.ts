import type { MonitoringExtensionAdapter } from '@libs/monitoring'

import { PostHog } from 'posthog-js/dist/module.no-external'

const posthog = new PostHog()

async function getSharedDistinctId() {
  const stored = await chrome.storage.local.get(['posthog_distinct_id'])
  if (stored.posthog_distinct_id) {
    return stored.posthog_distinct_id as string
  }

  const distinctId = crypto.randomUUID()
  await chrome.storage.local.set({ posthog_distinct_id: distinctId })
  return distinctId
}

const init = async () => {
  if (posthog.__loaded) return

  const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined
  if (!key) return

  const distinctID = await getSharedDistinctId()
  posthog.init(key, {
    bootstrap: { distinctID },
    api_host: (import.meta.env.VITE_POSTHOG_HOST as string) ?? 'https://us.i.posthog.com',
    disable_external_dependency_loading: true,
    error_tracking: {
      captureExtensionExceptions: true
    },
    persistence: 'localStorage'
  })
}

export const posthogMonitoringAdapter: MonitoringExtensionAdapter = {
  captureException: exception => {
    void (async () => {
      await init()
      posthog.captureException(exception)
    })()
  },
  identify: user => {
    void (async () => {
      await init()
      if (user) {
        posthog.identify(user.id)
      } else {
        posthog.reset()
      }
    })()
  },
  initialize: () => {
    void init()
  }
}
