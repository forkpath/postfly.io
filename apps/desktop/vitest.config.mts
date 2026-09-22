import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'desktop',
    watch: false,
    reporters: ['default', 'json'],
    outputFile: { json: '../../dist/desktop/test-results/unit.json' },
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx', 'tests/**/*.spec.mjs'],
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/apps/desktop' }
  }
})
