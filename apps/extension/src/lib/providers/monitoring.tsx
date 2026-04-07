import { useEffect } from 'react'

import { authClient } from '~/lib/auth'

import { createExtensionMonitoringStrategy, MonitoringProvider as MonitoringProviderEnum } from '@libs/monitoring'

const strategy = createExtensionMonitoringStrategy(MonitoringProviderEnum.POSTHOG)

strategy.initialize()

export const MonitoringProvider = ({ children }: { children: React.ReactNode }) => {
  const session = authClient.useSession()

  useEffect(() => {
    if (session.isPending) return

    const user = session.data?.user
    strategy.identify(user ? { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined } : null)
  }, [session])

  return <>{children}</>
}
