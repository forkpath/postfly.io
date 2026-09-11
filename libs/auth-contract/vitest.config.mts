import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/auth-contract',
  plugins: [tsconfigPaths({ root: __dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'auth-contract',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/auth-contract',
      provider: 'v8' as const
    }
  }
}))
