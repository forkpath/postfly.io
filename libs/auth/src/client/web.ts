import type { auth } from '../server'
import type { AuthClientOptions } from '../types'

import { passkeyClient } from '@better-auth/passkey/client'
import {
  adminClient,
  anonymousClient,
  inferAdditionalFields,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * React 客户端 - 用于组件内的 useSession 等 hooks
 */
export const createClient = (options?: AuthClientOptions) =>
  createAuthClient({
    ...options,
    plugins: [
      ...(options?.plugins ?? []),
      passkeyClient(),
      anonymousClient(),
      magicLinkClient(),
      twoFactorClient(),
      adminClient(),
      organizationClient(),
      lastLoginMethodClient(),
      inferAdditionalFields<typeof auth>()
    ]
  })
