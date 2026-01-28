import type { User } from '../types'

import * as z from 'zod'

import { getOrigin, mergeSearchParams } from '@libs/common'

import { MemberRole, UserRole } from '../types'

export const getUrl = ({ request, url, type }: { request?: Request; url?: string; type?: string }) => {
  const passedUrl = request?.headers.get('x-url')
  const expoOrigin = request?.headers.get('expo-origin')

  let resultUrl: URL

  if (passedUrl) {
    // Base on x-url; merge in params from provided `url` without overwriting existing keys
    resultUrl = new URL(passedUrl)
    if (url) {
      const urlObj = new URL(url, getOrigin(resultUrl.toString()) ?? expoOrigin ?? undefined)
      mergeSearchParams(resultUrl, urlObj, { overwrite: false })
    }
  } else if (expoOrigin) {
    // For Expo/mobile, base on expo-origin; if `url` has a query, adopt it entirely
    resultUrl = new URL(expoOrigin)
    if (url) {
      const targetUrl = new URL(url)
      if (targetUrl.search) {
        mergeSearchParams(resultUrl, targetUrl, { replace: true })
      }
    }
  } else {
    // For web, use the provided URL or fall back to the request URL
    resultUrl = new URL(url ?? request?.url ?? '')
  }

  if (type) {
    resultUrl.searchParams.set('type', type)
  }

  return resultUrl
}

const hierarchy: MemberRole[] = [MemberRole.MEMBER, MemberRole.ADMIN, MemberRole.OWNER]

export const generateName = (email?: string) => {
  return email?.split('@')[0] ?? 'Anonymous'
}

// 获取指定组织角色及以下的所有角色（如 ADMIN → [MEMBER, ADMIN]）
export const getAllRolesAtOrBelow = (role: MemberRole): MemberRole[] => {
  const idx = hierarchy.indexOf(role)
  if (idx === -1) return []

  return hierarchy.slice(0, idx + 1)
}

// 获取指定组织角色及以上的所有角色（如 ADMIN → [ADMIN, OWNER]）
export const getAllRolesAtOrAbove = (role: MemberRole): MemberRole[] => {
  const idx = hierarchy.indexOf(role)
  if (idx === -1) return []
  return hierarchy.slice(idx, hierarchy.length)
}

// 检查用户是否为全局管理员（user.role，非组织角色）
export const hasAdminPermission = (user: User) => user.role?.split(',').includes(UserRole.ADMIN) ?? false

// 检查组织成员是否拥有管理权限（admin 或 owner）
export const hasOrgAdminPermission = (role?: MemberRole) => role === MemberRole.ADMIN || role === MemberRole.OWNER

// 将未知类型安全转换为组织成员角色，无效值默认为 MEMBER
export const toMemberRole = (role: unknown): MemberRole => {
  if (z.enum(MemberRole).safeParse(role).success) {
    return z.enum(MemberRole).parse(role)
  }

  return MemberRole.MEMBER
}
