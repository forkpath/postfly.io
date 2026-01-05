import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'

import { prisma } from '@libs/pg-dao'

export const auth = betterAuth({
  appName: 'Ray',
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60 // 5分钟
    }
  },

  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  emailAndPassword: {
    enabled: true
  }
})
