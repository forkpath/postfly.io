'use client'

import type { AnalyticsProviderClientStrategy } from '@libs/analytics'

import { useCallback } from 'react'

import { webEnv } from '../../env'
import { usePageView } from './use-page-view'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

function initializeGoogleAnalytics() {
  if (typeof window === 'undefined' || !webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID) {
    return
  }

  window.dataLayer = window.dataLayer ?? []

  function gtag(...args: unknown[]) {
    window.dataLayer?.push(args)
  }

  window.gtag = gtag
  window.gtag('js', new Date())
  window.gtag('config', webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID)
}

function PageViewTracker() {
  const handlePageView = useCallback((path: string) => {
    if (typeof window === 'undefined' || !window.gtag || !webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      return
    }

    window.gtag('config', webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      page_path: path
    })
  }, [])

  usePageView(handlePageView)

  return null
}

export const googleAnalyticsClientStrategy = {
  Provider: ({ children }) => {
    if (!webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      return children
    }

    return (
      <>
        {children}
        <script
          async
          src={`https://www.googletagmanager.com/gtag/js?id=${webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID}`}
          onLoad={initializeGoogleAnalytics}
        />
        <PageViewTracker />
      </>
    )
  },
  track: (event, data) => {
    if (typeof window === 'undefined' || !window.gtag) {
      return
    }

    window.gtag('event', event, data)
  },
  identify: (userId, traits) => {
    if (typeof window === 'undefined' || !window.gtag || !webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      return
    }

    window.gtag('config', webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      user_id: userId,
      ...traits
    })
  },
  reset: () => {
    if (typeof window === 'undefined' || !window.gtag || !webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID) {
      return
    }

    window.gtag('config', webEnv.VITE_GOOGLE_ANALYTICS_MEASUREMENT_ID, {
      user_id: null
    })
  }
} satisfies AnalyticsProviderClientStrategy
