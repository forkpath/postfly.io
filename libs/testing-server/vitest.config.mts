import { defineConfig } from 'vitest/config'

import { unitCoverage } from '../../scripts/testing/unit-coverage.mjs'

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  test: {
    coverage: unitCoverage('libs/testing-server'),
    name: 'testing-server',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/testing-server/unit/junit.xml' }
  }
})
