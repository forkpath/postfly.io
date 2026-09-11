import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/services/worker',
  plugins: [tsconfigPaths({ root: __dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'worker',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/services/worker',
      provider: 'v8' as const
    }
  }
}))
