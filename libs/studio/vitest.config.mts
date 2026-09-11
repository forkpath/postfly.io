import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/libs/studio',
  plugins: [
    tsconfigPaths({
      root: __dirname,
      projects: ['../../tsconfig.base.json', './tsconfig.json']
    })
  ],
  test: {
    name: 'studio',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/studio',
      provider: 'v8' as const
    }
  }
}))
