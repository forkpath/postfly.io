import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: import.meta.dirname,
  envDir: false,
  cacheDir: '../../node_modules/.vite/services/engine',
  plugins: [
    tsconfigPaths({
      root: import.meta.dirname,
      envDir: false,
      projects: ['../../tsconfig.base.json', './tsconfig.app.json']
    })
  ],
  test: {
    name: 'engine',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/*.integration.spec.ts', '**/*.e2e.spec.ts'],
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/engine/unit/junit.xml' },
    coverage: {
      reportsDirectory: '../../coverage/services/engine',
      provider: 'v8' as const
    }
  }
}))
