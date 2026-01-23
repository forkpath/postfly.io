import type { User } from '@libs/auth/server'

import { cache } from 'react'
import { getRequestHeaders } from '@tanstack/react-start/server'

import { auth } from '@libs/auth/server'
import { ExecutionSide, Platform } from '@libs/common'

// 只能在服务端上下文使用：这些函数只能在 createServerFn、loader、或 SSR 期间调用
const getHeaders = async () => {
  const requestHeaders = getRequestHeaders()
  const newHeaders = new Headers(requestHeaders)
  newHeaders.set('x-client-platform', `${Platform.WEB}-${ExecutionSide.SERVER}`)
  return newHeaders
}

export const getSession = cache(async () => {
  const data = await auth.api.getSession({
    headers: await getHeaders()
  })

  return {
    session: data?.session ?? null,
    user: data?.user ?? null
  }
})

export const getOrganization = cache(async ({ id, slug }: { slug?: string; id?: string }) => {
  try {
    return await auth.api.getFullOrganization({
      query: {
        organizationId: id,
        organizationSlug: slug
      },
      headers: await getHeaders()
    })
  } catch (error) {
    console.error(error)
    return null
  }
})

export const getInvitation = cache(async ({ id }: { id: string }) => {
  try {
    return await auth.api.getInvitation({
      query: {
        id
      },
      headers: await getHeaders()
    })
  } catch {
    return null
  }
})

export const getUser = cache(async ({ id }: { id: string }) => {
  try {
    return (await auth.api.getUser({
      query: { id },
      headers: await getHeaders()
    })) as User
  } catch {
    return null
  }
})
