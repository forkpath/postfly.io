import path from 'node:path'

import { defineConfig } from 'vitest/config'

import tsconfig from './tsconfig.json' with { type: 'json' }

const aliases = Object.entries(tsconfig.compilerOptions.paths).map(([alias, [target]]) => ({
  find: new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '(.*)')}$`),
  replacement: path.resolve(import.meta.dirname, '../..', target).replace('*', '$1')
}))

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  resolve: { alias: aliases },

  test: {
    name: 'web',
    watch: false,
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    exclude: ['**/*.integration.spec.*', '**/e2e/**'],
    setupFiles: ['./tests/setup.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/web/unit/junit.xml' },
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/web' }
  }
})
