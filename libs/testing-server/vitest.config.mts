import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  test: {
    name: 'testing-server',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/testing-server/unit/junit.xml' }
  }
})
