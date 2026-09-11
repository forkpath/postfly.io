import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/auth-server',
  plugins: [tsconfigPaths({ root: __dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'auth-server',
    watch: false,
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      POSTGRES_DATABASE_URL: 'postgresql://ray_test:ray_test@127.0.0.1:5432/ray_test',
      BETTER_AUTH_SECRET: 'auth-server-test-secret-32-characters-minimum',
      BETTER_AUTH_URL: 'https://auth.example.test',
      EMAIL_FROM: 'noreply@example.test',
      RESEND_API_KEY: 're_auth_server_test',
      GOOGLE_CLIENT_ID: 'google-client-test',
      GOOGLE_CLIENT_SECRET: 'google-secret-test',
      GITHUB_CLIENT_ID: 'github-client-test',
      GITHUB_CLIENT_SECRET: 'github-secret-test',
      AUTH_APPLE_CLIENT_ID: 'apple-client-test',
      AUTH_APPLE_CLIENT_SECRET: 'apple-secret-test',
      AUTH_APPLE_APP_BUNDLE_IDENTIFIER: 'dev.ray.test'
    },
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/auth-server',
      provider: 'v8' as const
    }
  }
}))
