import type { ReactNode } from 'react'
import type { AnalyticsMobileAdapter } from '@libs/analytics'

import { useCallback, useEffect, useState } from 'react'

import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency'
import PostHog, { PostHogProvider } from 'posthog-react-native'
import { AppState } from 'react-native'

import { AnalyticsProvider, registerMobileAnalyticsAdapter } from '@libs/analytics'
import { mobileEnv } from '@libs/analytics-native/env'

let client: PostHog | null = null

function getClient(): PostHog | null {
  const key = mobileEnv.EXPO_PUBLIC_POSTHOG_KEY
  if (!key) return null

  client ??= new PostHog(key, {
    host: mobileEnv.EXPO_PUBLIC_POSTHOG_HOST,
    defaultOptIn: false
  })

  return client
}

function useTrackingPermissions() {
  const [granted, setGranted] = useState(false)

  const checkPermission = useCallback(async () => {
    const { granted: isGranted } = await requestTrackingPermissionsAsync()
    setGranted(isGranted)
  }, [])

  useEffect(() => {
    void checkPermission()
  }, [checkPermission])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', status => {
      if (status !== 'active') return
      void checkPermission()
    })
    return () => subscription.remove()
  }, [checkPermission])

  return granted
}

function TrackingOptIn({ children }: { children: ReactNode }) {
  const ph = getClient()
  const granted = useTrackingPermissions()

  useEffect(() => {
    if (!ph) return
    if (granted) void ph.optIn()
    else void ph.optOut()
  }, [granted, ph])

  return <>{children}</>
}

const adapter: AnalyticsMobileAdapter = {
  Provider: ({ children }) => {
    const key = mobileEnv.EXPO_PUBLIC_POSTHOG_KEY
    if (!key) {
      return <>{children}</>
    }

    const ph = getClient()
    if (!ph) {
      return <>{children}</>
    }

    return (
      <PostHogProvider client={ph} autocapture>
        <TrackingOptIn>{children}</TrackingOptIn>
      </PostHogProvider>
    )
  },
  track: (event, data) => {
    getClient()?.capture(event, data)
  },
  identify: (userId, traits) => {
    getClient()?.identify(userId, traits)
  },
  reset: () => {
    getClient()?.reset()
  }
}

registerMobileAnalyticsAdapter(AnalyticsProvider.POSTHOG, adapter)
