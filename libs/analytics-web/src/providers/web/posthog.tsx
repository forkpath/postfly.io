'use client'

import type { AnalyticsProviderClientStrategy } from '@libs/analytics'

import { useCallback } from 'react'

import { PostHogProvider } from '@posthog/react'
import posthog from 'posthog-js'

import { webEnv } from '../../env'
import { usePageView } from './use-page-view'

if (typeof window !== 'undefined' && !posthog.__loaded && webEnv.VITE_POSTHOG_KEY) {
  posthog.init(webEnv.VITE_POSTHOG_KEY, {
    api_host: webEnv.VITE_POSTHOG_HOST,
    person_profiles: 'always',
    capture_pageview: false,
    disable_external_dependency_loading: true,
    disable_session_recording: true
  })
}

function PageViewTracker() {
  const handlePageView = useCallback((path: string, url: string) => {
    posthog.capture('$pageview', {
      $current_url: url,
      path
    })
  }, [])

  usePageView(handlePageView)

  return null
}

export const posthogClientStrategy = {
  Provider: ({ children }) => {
    if (!webEnv.VITE_POSTHOG_KEY) {
      return children
    }

    return (
      <PostHogProvider client={posthog}>
        {children}
        <PageViewTracker />
      </PostHogProvider>
    )
  },
  track: (event, properties) => {
    if (typeof window === 'undefined' || !webEnv.VITE_POSTHOG_KEY) {
      return
    }

    posthog.capture(event, properties)
  },
  identify: (userId, traits) => {
    if (typeof window === 'undefined' || !webEnv.VITE_POSTHOG_KEY) {
      return
    }

    posthog.identify(userId, traits)
  },
  reset: () => {
    if (typeof window === 'undefined' || !webEnv.VITE_POSTHOG_KEY) {
      return
    }

    posthog.reset()
  }
} satisfies AnalyticsProviderClientStrategy
