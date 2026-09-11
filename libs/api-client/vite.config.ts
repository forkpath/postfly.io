/// <reference types='vitest' />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/api-client',
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] })],
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] }) ],
  // },
  test: {
    name: 'api-client',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/api-client',
      provider: 'v8' as const
    }
  }
}))
