import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

import { unitCoverage } from '../../scripts/testing/unit-coverage.mjs'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tsconfigPaths()],
  test: {
    name: 'server-sms',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: unitCoverage('libs/server-sms')
  }
})
