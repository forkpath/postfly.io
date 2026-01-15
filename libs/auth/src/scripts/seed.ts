import { PrismaClient } from '@libs/pg-dao'

import { env } from '../env'
import { generateName } from '../lib/utils'
import { auth } from '../server'
import { MemberRole, UserRole } from '../types'

const prisma = new PrismaClient() as any

const context = await auth.$context

const SEED_PASSWORD_HASH = await context.password.hash(env.SEED_PASSWORD)

const getEmail = (suffix: string | string[]) => {
  const [name, domain] = env.SEED_EMAIL.split('@')

  return `${name}+${Array.isArray(suffix) ? suffix.join('-') : suffix}@${domain}`
}

const getImage = (name: string) => `https://avatar.vercel.sh/${name}`

const seedUser = async ({ email, role = UserRole.USER }: { email: string; role?: UserRole }) => {
  const name = generateName(email)

  return await prisma.$transaction(async tx => {
    const userId = context.generateId({ model: 'user' }).toString()
    const userToInsert = {
      name,
      email,
      role,
      image: getImage(name),
      emailVerified: true,
      isAnonymous: false
    }

    const user = await tx.user.upsert({
      where: { email },
      update: userToInsert,
      create: { ...userToInsert, id: userId }
    })

    if (!user) {
      return
    }

    const alreadyExistingAccount = await tx.account.findFirst({
      where: { userId: user.id, providerId: 'credential' }
    })

    if (!alreadyExistingAccount) {
      const accountToInsert = {
        id: context.generateId({ model: 'account' }).toString(),
        accountId: context.generateId({ model: 'account' }).toString(),
        providerId: 'credential',
        password: SEED_PASSWORD_HASH,
        userId: user.id
      }

      await tx.account.create({ data: accountToInsert })
    }

    return user
  })
}

const seedOrganizationMember = async ({ organizationId, role }: { organizationId: string; role: MemberRole }) =>
  prisma.$transaction(async tx => {
    const email = getEmail([`org`, role])
    const user = await seedUser({ email })

    if (!user) {
      return
    }

    const memberToInsert = {
      id: context.generateId({ model: 'member' }).toString(),
      organizationId,
      role,
      userId: user.id,
      createdAt: new Date()
    }

    const alreadyExistingMember = await tx.member.findFirst({
      where: {
        userId: memberToInsert.userId,
        organizationId: memberToInsert.organizationId
      }
    })

    if (alreadyExistingMember) {
      const updatedMember = await tx.member.update({
        where: { id: alreadyExistingMember.id },
        data: memberToInsert
      })

      return updatedMember
    }

    const member = await tx.member.create({ data: memberToInsert })

    return member
  })

const seedOrganizationInvitation = async ({
  organizationId,
  inviterId,
  role
}: {
  organizationId: string
  inviterId: string
  role: MemberRole
}) =>
  prisma.$transaction(async tx => {
    const invitationToInsert = {
      id: context.generateId({ model: 'invitation' }).toString(),
      organizationId,
      role,
      email: getEmail([`org`, `invite`, role]),
      expiresAt: new Date(
        Date.now() + (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 1000 * 60 * 60 * 24)
      ),
      inviterId
    }

    const alreadyExistingInvitation = await tx.invitation.findFirst({
      where: {
        organizationId: invitationToInsert.organizationId,
        email: invitationToInsert.email
      }
    })

    if (alreadyExistingInvitation) {
      const updatedInvitation = await tx.invitation.update({
        where: { id: alreadyExistingInvitation.id },
        data: invitationToInsert
      })
      return updatedInvitation
    }

    const invitation = await tx.invitation.create({
      data: invitationToInsert
    })

    return invitation
  })

const seedOrganization = async () => {
  const organizationId = context.generateId({ model: 'organization' }).toString()
  const organizationSlug = 'seed-organization'

  const organizationToInsert = {
    name: organizationSlug,
    slug: organizationSlug,
    logo: getImage(organizationSlug),
    createdAt: new Date()
  }

  const organization = await prisma.organization.upsert({
    where: { slug: organizationSlug },
    update: organizationToInsert,
    create: { ...organizationToInsert, id: organizationId }
  })

  if (!organization) {
    return
  }

  const members = await Promise.all(
    Object.values(MemberRole).map(role => seedOrganizationMember({ organizationId: organization.id, role }))
  )

  await Promise.all(
    members.flatMap(member =>
      Object.values(MemberRole)
        .filter(role => role !== MemberRole.OWNER)
        .map(role =>
          seedOrganizationInvitation({
            organizationId: organization.id,
            role,
            inviterId: member?.userId ?? ''
          })
        )
    )
  )

  return organization
}

const seedUsers = async () =>
  Promise.all(Object.values(UserRole).map(role => seedUser({ email: getEmail(role), role })))

async function main() {
  await seedUsers()
  await seedOrganization()

  console.info('Auth seeded successfully')
  process.exit(0)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
