import type { User } from './auth-contract'
import type { MemberRole } from '@libs/common'

import * as z from 'zod'

import { getOrigin, MemberRole as MemberRoleValue, mergeSearchParams, UserRole } from '@libs/common'

export const getUrl = ({ request, url, type }: { request?: Request; url?: string; type?: string }) => {
  const passedUrl = request?.headers.get('x-url')
  const expoOrigin = request?.headers.get('expo-origin')
  let resultUrl: URL

  if (passedUrl) {
    resultUrl = new URL(passedUrl)
    if (url) {
      const urlObj = new URL(url, getOrigin(resultUrl.toString()) ?? expoOrigin ?? undefined)
      mergeSearchParams(resultUrl, urlObj, { overwrite: false })
    }
  } else if (expoOrigin) {
    resultUrl = new URL(expoOrigin)
    if (url) {
      const targetUrl = new URL(url)
      if (targetUrl.search) mergeSearchParams(resultUrl, targetUrl, { replace: true })
    }
  } else {
    resultUrl = new URL(url ?? request?.url ?? '')
  }

  if (type) resultUrl.searchParams.set('type', type)
  return resultUrl
}

const hierarchy: MemberRole[] = [MemberRoleValue.MEMBER, MemberRoleValue.ADMIN, MemberRoleValue.OWNER]

export const generateName = (email?: string) => email?.split('@')[0] ?? 'Anonymous'

export const getAllRolesAtOrBelow = (role: MemberRole): MemberRole[] => {
  const index = hierarchy.indexOf(role)
  return index === -1 ? [] : hierarchy.slice(0, index + 1)
}

export const getAllRolesAtOrAbove = (role: MemberRole): MemberRole[] => {
  const index = hierarchy.indexOf(role)
  return index === -1 ? [] : hierarchy.slice(index)
}

export const hasAdminPermission = (user: User) => user.role?.split(',').includes(UserRole.ADMIN) ?? false

export const hasOrgAdminPermission = (role?: MemberRole) =>
  role === MemberRoleValue.ADMIN || role === MemberRoleValue.OWNER

export const toMemberRole = (role: unknown): MemberRole => {
  const result = z.enum(MemberRoleValue).safeParse(role)
  return result.success ? result.data : MemberRoleValue.MEMBER
}
