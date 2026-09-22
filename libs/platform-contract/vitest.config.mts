import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/platform-contract',
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'platform-contract',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/platform-contract',
      provider: 'v8' as const
    }
  }
}))
