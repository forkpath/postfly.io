import type { PermissionCheckParams } from '@libs/auth-contract'
import type { BetterAuthClientOptions } from 'better-auth'

import { passkeyClient } from '@better-auth/passkey/client'
import {
  adminClient,
  anonymousClient,
  lastLoginMethodClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { ac } from '@libs/auth-contract'

export const createClient = (options?: Omit<BetterAuthClientOptions, 'plugins'>) =>
  createAuthClient({
    ...options,
    plugins: [
      passkeyClient(),
      anonymousClient(),
      magicLinkClient(),
      twoFactorClient(),
      adminClient(),
      organizationClient({ ac }),
      lastLoginMethodClient()
    ]
  })

export type AuthClient = ReturnType<typeof createClient>

export async function checkPermission(client: AuthClient, permissions: PermissionCheckParams): Promise<boolean> {
  try {
    const permissionClient = client as typeof client & {
      organization: {
        hasPermission(input: { permissions: PermissionCheckParams }): Promise<unknown>
      }
    }
    const result = await permissionClient.organization.hasPermission({ permissions })
    return resolvePermissionCheckSuccess(result)
  } catch {
    return false
  }
}

export function checkRolePermission<R extends string = string>(
  client: AuthClient,
  role: R,
  permissions: PermissionCheckParams
): boolean {
  return client.organization.checkRolePermission({
    role: role as 'owner' | 'admin' | 'member',
    permissions
  })
}

export const resolvePermissionCheckSuccess = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (!value || typeof value !== 'object') return false

  const parsed = value as { success?: unknown; data?: { success?: unknown } }
  if (typeof parsed.success === 'boolean') return parsed.success
  if (typeof parsed.data?.success === 'boolean') return parsed.data.success
  return false
}
