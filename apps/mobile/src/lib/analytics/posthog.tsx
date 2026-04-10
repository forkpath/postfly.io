import type { PropsWithChildren } from 'react'
import type { AnalyticsMobileAdapter } from '@libs/analytics'

import PostHog, { PostHogProvider } from 'posthog-react-native'

import { mobileEnv } from '@libs/analytics'

const apiKey = mobileEnv.EXPO_PUBLIC_POSTHOG_KEY
const host = mobileEnv.EXPO_PUBLIC_POSTHOG_HOST

let clientPromise: Promise<PostHog> | null = null

function ensureClient(): Promise<PostHog> | null {
  if (!apiKey) return null
  if (clientPromise) return clientPromise

  clientPromise = PostHog.initAsync(apiKey, { host })
  return clientPromise
}

function Provider({ children }: PropsWithChildren) {
  if (!apiKey) {
    return <>{children}</>
  }

  return (
    <PostHogProvider apiKey={apiKey} options={{ host }} autocapture>
      {children}
    </PostHogProvider>
  )
}

export const posthogMobileAnalyticsAdapter: AnalyticsMobileAdapter = {
  Provider,
  track: (event, data) => {
    void ensureClient()?.then(c => c.capture(event, data))
  },
  identify: (userId, traits) => {
    void ensureClient()?.then(c => c.identify(userId, traits))
  },
  reset: () => {
    void ensureClient()?.then(c => c.reset())
  }
}
