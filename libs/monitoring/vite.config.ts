/// <reference types='vitest' />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/monitoring',
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'monitoring',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/monitoring',
      provider: 'v8' as const
    }
  }
}))
