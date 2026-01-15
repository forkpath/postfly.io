import type { Preset } from 'envin/types'

import { defineEnv } from 'envin'
import * as z from 'zod'

export const preset = {
  id: 'auth',
  server: {
    BETTER_AUTH_SECRET: z.string(),

    APPLE_CLIENT_ID: z.string().optional().default(''),
    APPLE_CLIENT_SECRET: z.string().optional().default(''),
    APPLE_APP_BUNDLE_IDENTIFIER: z.string().optional().default(''),
    GOOGLE_CLIENT_ID: z.string().optional().default(''),
    GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
    GITHUB_CLIENT_ID: z.string().optional().default(''),
    GITHUB_CLIENT_SECRET: z.string().optional().default(''),

    SEED_EMAIL: z.email().optional().default('me@turbostarter.dev'),
    SEED_PASSWORD: z.string().optional().default('Pa$$w0rd')
  }
} as const satisfies Preset

export const env = defineEnv({
  ...preset,
  env: {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID,
    APPLE_CLIENT_SECRET: process.env.APPLE_CLIENT_SECRET,
    APPLE_APP_BUNDLE_IDENTIFIER: process.env.APPLE_APP_BUNDLE_IDENTIFIER,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    SEED_EMAIL: process.env.SEED_EMAIL,
    SEED_PASSWORD: process.env.SEED_PASSWORD
  }
})
