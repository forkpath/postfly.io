import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['../../tsconfig.base.json'] })],
  test: {
    name: 'email-server',
    watch: false,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'src/**/*.spec.tsx'],
    coverage: { provider: 'v8', reportsDirectory: '../../coverage/libs/email-server' }
  }
})
