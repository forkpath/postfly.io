import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

import tsconfig from './tsconfig.json' with { type: 'json' }

// WXT 0.20's WxtVitest always calls dotenv, even with configFile: false.
// Use its official fake browser without booting WXT or reading developer .env.
const aliases = Object.entries(tsconfig.compilerOptions.paths).map(([alias, [target]]) => ({
  find: new RegExp(`^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '(.*)')}$`),
  replacement: path.resolve(import.meta.dirname, '../..', target).replace('*', '$1')
}))

export default defineConfig({
  root: import.meta.dirname,
  envDir: false,
  esbuild: { jsx: 'automatic' },

  resolve: {
    alias: [
      { find: 'wxt/browser', replacement: fileURLToPath(new URL('./tests/browser.ts', import.meta.url)) },
      ...aliases
    ]
  },
  test: {
    name: 'extension',
    watch: false,
    environment: 'jsdom',
    include: ['tests/**/*.spec.{ts,tsx}'],
    setupFiles: ['./tests/setup.ts'],
    env: {
      VITE_URL: 'http://127.0.0.1:4178',
      VITE_API_BASE_URL: 'http://127.0.0.1:4178/api/v1',
      VITE_DEFAULT_LOCALE: 'en',
      VITE_THEME_MODE: 'system',
      VITE_THEME_COLOR: 'orange'
    },
    reporters: ['default', 'junit'],
    outputFile: { junit: '../../dist/test-results/extension/unit/junit.xml' },
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/extension' }
  }
})
