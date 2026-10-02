import { randomUUID } from 'node:crypto'

import { hashPassword } from 'better-auth/crypto'

import { prisma } from '@libs/pg-dao'

import { assertIsolatedTestEnvironment } from './isolated-environment'

export async function createIdentity(role = 'user') {
  assertIsolatedTestEnvironment()
  const id = randomUUID()
  const email = `${id}@example.invalid`
  const password = `${randomUUID()}-Aa1!`
  await prisma.user.create({
    data: {
      id,
      name: 'Framework test',
      email,
      emailVerified: true,
      role,
      accounts: {
        create: { id: randomUUID(), accountId: id, providerId: 'credential', password: await hashPassword(password) }
      }
    }
  })
  return { id, email, password }
}

export function responseCookie(response: Response) {
  const cookie = response.headers
    .getSetCookie()
    .map(value => value.split(';')[0])
    .join('; ')
  if (!response.ok || !cookie) throw new Error(`Test sign-in failed: ${response.status}`)
  return cookie
}

export async function createOrganization(userId: string) {
  assertIsolatedTestEnvironment()
  const id = randomUUID()
  return prisma.organization.create({
    data: {
      id,
      name: 'Framework fixture',
      slug: `test-${id}`,
      createdAt: new Date(),
      members: { create: { id: randomUUID(), userId, role: 'owner', createdAt: new Date() } }
    }
  })
}
