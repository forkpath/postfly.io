import { prisma } from './prisma'

async function main() {
  // Add idempotent application demo records here after auth-server:seed.
  await prisma.$queryRaw`SELECT 1`
  console.log('Application seed database is ready; no additional demo entities configured')
}

main()
  .catch(error => {
    console.error('Application seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
