import { useEffect } from 'react'

import { authClient } from '~/lib/auth'

import { identify, initialize } from '@libs/monitoring-native'

import '~/lib/monitoring/sentry'

initialize()

export const MonitoringProvider = ({ children }: { children: React.ReactNode }) => {
  const session = authClient.useSession()

  useEffect(() => {
    if (session.isPending) {
      return
    }

    identify(session.data?.user ?? null)
  }, [session])

  return children
}
