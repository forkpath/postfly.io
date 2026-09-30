import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

import { unitCoverage } from '../../scripts/testing/unit-coverage.mjs'

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/analytics-web',
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'analytics-web',
    watch: false,
    // Environment-isolation tests intentionally reset and import each runtime.
    // Leave time for a cold SDK transform on shared CI runners, without retries.
    testTimeout: 15_000,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: unitCoverage('libs/analytics-web')
  }
})
