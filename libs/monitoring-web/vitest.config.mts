import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

import { unitCoverage } from '../../scripts/testing/unit-coverage.mjs'

export default defineConfig({
  root: import.meta.dirname,
  plugins: [tsconfigPaths({ projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'monitoring-web',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: unitCoverage('libs/monitoring-web')
  }
})
