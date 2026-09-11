import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/api-client',
  plugins: [tsconfigPaths({ root: __dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'api-client',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/api-client',
      provider: 'v8' as const
    }
  }
}))
