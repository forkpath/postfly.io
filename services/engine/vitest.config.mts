import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/services/engine',
  plugins: [
    tsconfigPaths({
      root: import.meta.dirname,
      projects: ['../../tsconfig.base.json', './tsconfig.app.json']
    })
  ],
  test: {
    name: 'engine',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/services/engine',
      provider: 'v8' as const
    }
  }
}))
