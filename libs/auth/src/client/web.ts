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
