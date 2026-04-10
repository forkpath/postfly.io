import type { PropsWithChildren } from 'react'

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { SafeAreaProvider } from 'react-native-safe-area-context'

import './monitoring/sentry'

import {
  Provider as AnalyticsProviderRoot,
  identify as identifyAnalytics,
  reset as resetAnalytics
} from '@libs/analytics/mobile'
import { Provider as BillingProviderRoot, useCustomer } from '@libs/billing/mobile'
import {
  identify as identifyMonitoring,
  initialize as initializeMonitoring,
  Provider as MonitoringProviderRoot
} from '@libs/monitoring/mobile'

import { authClient } from './auth'
import { ensureMobileIntegrationsRegistered } from './mobile-integrations'

const queryClient = new QueryClient()

function AnalyticsProvider({ children }: PropsWithChildren) {
  const session = authClient.useSession()

  useEffect(() => {
    if (session.isPending) {
      return
    }

    if (session.data?.user) {
      identifyAnalytics(session.data.user.id, {
        email: session.data.user.email,
        name: session.data.user.name
      })
      return
    }

    resetAnalytics()
  }, [session])

  return <AnalyticsProviderRoot>{children}</AnalyticsProviderRoot>
}

function MonitoringProvider({ children }: PropsWithChildren) {
  const session = authClient.useSession()

  useEffect(() => {
    void initializeMonitoring()
  }, [])

  useEffect(() => {
    if (session.isPending) {
      return
    }

    identifyMonitoring(
      session.data?.user
        ? {
            id: session.data.user.id,
            email: session.data.user.email,
            name: session.data.user.name
          }
        : null
    )
  }, [session])

  return <MonitoringProviderRoot>{children}</MonitoringProviderRoot>
}

function BillingProvider({ children }: PropsWithChildren) {
  const session = authClient.useSession()
  const { identify, reset } = useCustomer()

  useEffect(() => {
    if (session.isPending) {
      return
    }

    if (session.data?.user) {
      identify(session.data.user.id)
      return
    }

    reset()
  }, [identify, reset, session])

  return <>{children}</>
}

export function Providers({ children }: PropsWithChildren) {
  ensureMobileIntegrationsRegistered()

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <MonitoringProvider>
          <AnalyticsProvider>
            <BillingProviderRoot>
              <BillingProvider>{children}</BillingProvider>
            </BillingProviderRoot>
          </AnalyticsProvider>
        </MonitoringProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
