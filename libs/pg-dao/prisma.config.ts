import 'dotenv/config'

import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.POSTGRES_DATABASE_URL ?? process.env.POSGTRES_DATABASE_URL

if (!databaseUrl) {
  throw new Error('POSTGRES_DATABASE_URL is required')
}

export default defineConfig({
  schema: './src',
  migrations: {
    path: './src/migrations',
    seed: 'tsx ./src/seed.ts'
  },
  datasource: {
    url: databaseUrl
  }
})
