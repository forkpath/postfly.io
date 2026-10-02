import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

import { unitCoverage } from '../../scripts/testing/unit-coverage.mjs'

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json', './tsconfig.json'] })],
  test: {
    name: 'ui-web',
    watch: false,
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/ui-web/unit/junit.xml' },
    coverage: unitCoverage('libs/ui-web')
  }
})
