import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { prisma } from '@libs/pg-dao'

interface Options {
  apply: boolean
  batchSize: number
  cursor?: string
  reportPath: string
}

function readOption(name: string): string | undefined {
  const prefix = `--${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length)
}

function parseOptions(): Options {
  const batchSize = Number(readOption('batch-size') ?? '500')
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 5000) {
    throw new Error('--batch-size must be an integer between 1 and 5000')
  }
  return {
    apply: process.argv.includes('--apply'),
    batchSize,
    cursor: readOption('cursor'),
    reportPath: resolve(readOption('report') ?? 'artifacts/migrations/billing-owner-quarantine.jsonl')
  }
}

async function main() {
  const options = parseOptions()
  let cursor = options.cursor
  let scanned = 0
  let updated = 0
  const quarantine: Record<string, unknown>[] = []

  console.log(
    JSON.stringify({
      phase: 'billing-owner-backfill',
      mode: options.apply ? 'apply' : 'dry-run',
      batchSize: options.batchSize,
      cursor: cursor ?? null
    })
  )

  while (true) {
    const customers = await prisma.customer.findMany({
      where: {
        userId: null,
        organizationId: null,
        ...(cursor ? { id: { gt: cursor } } : {})
      },
      orderBy: { id: 'asc' },
      take: options.batchSize
    })
    if (customers.length === 0) break

    const decisions = await Promise.all(
      customers.map(async customer => {
        const [user, collision] = await Promise.all([
          prisma.user.findUnique({
            where: { id: customer.referenceId },
            select: { id: true }
          }),
          prisma.customer.findFirst({
            where: {
              id: { not: customer.id },
              userId: customer.referenceId,
              provider: customer.provider
            },
            select: { id: true }
          })
        ])
        return { customer, user, collision }
      })
    )

    for (const decision of decisions) {
      if (!decision.user || decision.collision) {
        quarantine.push({
          customerId: decision.customer.id,
          referenceId: decision.customer.referenceId,
          provider: decision.customer.provider,
          reason: decision.collision ? 'owner_provider_collision' : 'reference_id_does_not_match_user'
        })
      }
    }

    if (quarantine.length > 0) break

    if (options.apply) {
      await prisma.$transaction(
        decisions.map(({ customer }) =>
          prisma.customer.update({
            where: { id: customer.id },
            data: { userId: customer.referenceId }
          })
        )
      )
      updated += decisions.length
    }

    scanned += decisions.length
    cursor = customers.at(-1)?.id
    console.log(JSON.stringify({ phase: 'batch-complete', scanned, updated, cursor }))
  }

  if (quarantine.length > 0) {
    mkdirSync(dirname(options.reportPath), { recursive: true })
    writeFileSync(options.reportPath, `${quarantine.map(item => JSON.stringify(item)).join('\n')}\n`, 'utf8')
    console.error(
      JSON.stringify({
        phase: 'quarantined',
        count: quarantine.length,
        cursor: cursor ?? null,
        reportPath: options.reportPath
      })
    )
    process.exitCode = 2
    return
  }

  console.log(
    JSON.stringify({
      phase: 'complete',
      mode: options.apply ? 'apply' : 'dry-run',
      scanned,
      updated,
      cursor: cursor ?? null
    })
  )
}

void main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
