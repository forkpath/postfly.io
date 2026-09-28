import { randomUUID } from 'node:crypto'

import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '@libs/pg-dao'
import { createIdentity, createOrganization } from '@libs/testing-server'

describe('Postgres framework identity adapter', () => {
  afterAll(() => prisma.$disconnect())

  it('persists membership, rejects duplicates and cascades when the owner is removed', async () => {
    const user = await createIdentity()
    const organization = await createOrganization(user.id)
    const key = { organizationId_userId: { organizationId: organization.id, userId: user.id } }
    expect(await prisma.member.findUnique({ where: key })).toMatchObject({ role: 'owner', userId: user.id })
    await expect(
      prisma.member.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          userId: user.id,
          role: 'member',
          createdAt: new Date()
        }
      })
    ).rejects.toMatchObject({ code: 'P2002' })
    await prisma.user.delete({ where: { id: user.id } })
    expect(await prisma.member.findUnique({ where: key })).toBeNull()
    await prisma.organization.delete({ where: { id: organization.id } })
  })
})
