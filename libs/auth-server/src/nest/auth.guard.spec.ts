import type { TestingModule } from '@nestjs/testing'

import { ForbiddenException, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host'
import { Test } from '@nestjs/testing'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { auth } from '../lib/auth-server'
import { MODULE_OPTIONS_TOKEN } from './auth-module-definition'
import { AuthGuard } from './auth.guard'

const modules: TestingModule[] = []

async function fixture(metadata: Record<string, unknown> = {}) {
  const request: { headers: { cookie: string }; user?: unknown; session?: unknown } = {
    headers: { cookie: 'better-auth.session_token=fixture' }
  }
  class Controller {}
  const handler = () => undefined
  for (const [key, value] of Object.entries(metadata)) Reflect.defineMetadata(key, value, handler)
  const moduleRef = await Test.createTestingModule({
    providers: [AuthGuard, Reflector, { provide: MODULE_OPTIONS_TOKEN, useValue: { auth } }]
  }).compile()
  modules.push(moduleRef)
  return {
    request,
    context: new ExecutionContextHost([request], Controller, handler),
    guard: moduleRef.get(AuthGuard)
  }
}

function session(role: string) {
  const now = new Date()
  return {
    session: {
      id: 'session',
      token: 'token',
      userId: 'user',
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(now.getTime() + 60_000)
    },
    user: {
      id: 'user',
      name: 'Test',
      email: 'test@example.invalid',
      emailVerified: true,
      twoFactorEnabled: false,
      isAnonymous: false,
      banned: false,
      createdAt: now,
      updatedAt: now,
      role
    }
  }
}

describe('Nest authentication guard', () => {
  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(modules.splice(0).map(moduleRef => moduleRef.close()))
  })

  it('rejects a protected request with no verified session', async () => {
    const getSession = vi.spyOn(auth.api, 'getSession').mockResolvedValue(null)
    const { request, context, guard } = await fixture()
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException)
    expect(new Headers(getSession.mock.calls[0]?.[0]?.headers).get('cookie')).toBe(request.headers.cookie)
    expect(request.user).toBeNull()
  })

  it.each(['PUBLIC', 'OPTIONAL'])('allows anonymous access only when %s metadata enables it', async key => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(null)
    const { context, guard } = await fixture({ [key]: true })
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('rejects a regular user from an admin route and attaches verified identity', async () => {
    const identity = session('user')
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(identity)
    const { request, context, guard } = await fixture({ ROLES: ['admin'] })
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException)
    expect(request.user).toBe(identity.user)
    expect(request.session).toBe(identity)
  })

  it('accepts an admin among comma-separated roles', async () => {
    vi.spyOn(auth.api, 'getSession').mockResolvedValue(session('user,admin'))
    const { context, guard } = await fixture({ ROLES: ['admin'] })
    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('propagates session-provider failures without granting access', async () => {
    const failure = new Error('Session store unavailable')
    vi.spyOn(auth.api, 'getSession').mockRejectedValue(failure)
    const { context, guard } = await fixture()
    await expect(guard.canActivate(context)).rejects.toBe(failure)
  })
})
