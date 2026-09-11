import { getBillingCustomers, upsertBillingCustomer } from '@libs/billing-server'
import { prisma } from '@libs/pg-dao'

const stage = process.argv.find(argument => argument.startsWith('--stage='))?.slice('--stage='.length)
const userOwner = { kind: 'user', userId: 'history-user-a' } as const
const organizationOwner = {
  kind: 'organization',
  organizationId: 'history-org'
} as const
const userProvider = 'compatibility-provider'
const userExternalId = 'compatibility-user-customer'
const organizationProvider = 'stripe'
const organizationExternalId = 'compatibility-organization-customer'

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function verifyLegacy() {
  const result = await upsertBillingCustomer({
    owner: userOwner,
    provider: userProvider,
    externalId: userExternalId
  })
  invariant(result.referenceId === userOwner.userId, 'legacy write lost referenceId')
  invariant(
    result.owner?.kind === 'user' && result.owner.userId === userOwner.userId,
    'legacy write response did not preserve the server-derived owner'
  )

  const row = await prisma.customer.findUniqueOrThrow({
    where: {
      externalId_provider: {
        externalId: userExternalId,
        provider: userProvider
      }
    }
  })
  invariant(row.userId === null, 'legacy write populated userId')
  invariant(row.organizationId === null, 'legacy write populated organizationId')

  const customers = await getBillingCustomers(userOwner, userProvider)
  invariant(customers.length === 1, 'legacy read did not find the customer')
  invariant(customers[0]?.id === row.id, 'legacy read returned the wrong customer')
  invariant(
    customers[0]?.owner?.kind === 'user' && customers[0].owner.userId === userOwner.userId,
    'legacy read response did not preserve the server-derived owner'
  )
}

async function verifyDualWrite() {
  const result = await upsertBillingCustomer({
    owner: userOwner,
    provider: userProvider,
    externalId: userExternalId
  })
  invariant(result.referenceId === userOwner.userId, 'dual write lost referenceId')
  invariant(
    result.owner?.kind === 'user' && result.owner.userId === userOwner.userId,
    'dual write did not populate the user owner'
  )

  const row = await prisma.customer.findUniqueOrThrow({
    where: {
      externalId_provider: {
        externalId: userExternalId,
        provider: userProvider
      }
    }
  })
  invariant(row.referenceId === row.userId, 'dual write columns disagree')
  invariant(row.organizationId === null, 'dual write created a second owner')
}

async function verifyRead(ownerMode: 'shadow' | 'v2') {
  const errors: unknown[][] = []
  const originalError = console.error
  console.error = (...arguments_: unknown[]) => errors.push(arguments_)
  try {
    const customers = await getBillingCustomers(userOwner, userProvider)
    invariant(customers.length === 1, `${ownerMode} read did not find the customer`)
    invariant(
      customers[0]?.owner?.kind === 'user' && customers[0].owner.userId === userOwner.userId,
      `${ownerMode} read returned an invalid owner`
    )
  } finally {
    console.error = originalError
  }
  invariant(errors.length === 0, `${ownerMode} read reported a shadow mismatch`)
}

async function verifyOrganization() {
  const result = await upsertBillingCustomer({
    owner: organizationOwner,
    provider: organizationProvider,
    externalId: organizationExternalId
  })
  invariant(
    result.referenceId === organizationOwner.organizationId,
    'organization write lost referenceId compatibility'
  )
  invariant(
    result.owner?.kind === 'organization' && result.owner.organizationId === organizationOwner.organizationId,
    'organization write did not populate organizationId'
  )

  const customers = await getBillingCustomers(organizationOwner, organizationProvider)
  invariant(customers.length === 1, 'organization V2 read did not find customer')
  invariant(customers[0]?.externalId === organizationExternalId, 'organization V2 read returned the wrong customer')
}

async function main() {
  switch (stage) {
    case 'legacy':
      await verifyLegacy()
      break
    case 'dual-write':
      await verifyDualWrite()
      break
    case 'shadow-read':
      await verifyRead('shadow')
      break
    case 'v2-read':
      await verifyRead('v2')
      break
    case 'organization':
      await verifyOrganization()
      break
    default:
      throw new Error('--stage must be legacy, dual-write, shadow-read, v2-read, or organization')
  }

  console.log(`Billing application compatibility stage passed: ${stage}`)
}

void main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
