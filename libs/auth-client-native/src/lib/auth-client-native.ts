import type { LastLoginMethodClientConfig } from '@better-auth/expo/plugins'
import type { PermissionCheckParams } from '@libs/auth-contract'
import type { BetterAuthClientOptions, BetterAuthClientPlugin } from 'better-auth'

import { expoClient } from '@better-auth/expo/client'
import { lastLoginMethodClient } from '@better-auth/expo/plugins'
import {
  adminClient,
  anonymousClient,
  emailOTPClient,
  magicLinkClient,
  organizationClient,
  twoFactorClient
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

import { ac } from '@libs/auth-contract'

import { resolvePermissionCheckSuccess } from './permission-result'

export { resolvePermissionCheckSuccess } from './permission-result'

export type AuthMobileClientOptions = Parameters<typeof expoClient>[0]
type ExpoClientOptions = AuthMobileClientOptions

export const createClient = ({
  mobile,
  lastLoginMethod,
  ...options
}: Omit<BetterAuthClientOptions, 'plugins'> & {
  mobile: ExpoClientOptions
  lastLoginMethod: LastLoginMethodClientConfig
}) => {
  type ExpoPlugin = ReturnType<typeof expoClient>
  type CompatibleExpoPlugin = Omit<ExpoPlugin, 'getActions'> & {
    getActions: ExpoPlugin['getActions'] & BetterAuthClientPlugin['getActions']
  }
  const mobilePlugin = expoClient(mobile) as CompatibleExpoPlugin

  return createAuthClient({
    ...options,
    plugins: [
      anonymousClient(),
      magicLinkClient(),
      emailOTPClient(),
      twoFactorClient(),
      adminClient(),
      organizationClient({ ac }),
      lastLoginMethodClient(lastLoginMethod),
      mobilePlugin
    ]
  })
}

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
