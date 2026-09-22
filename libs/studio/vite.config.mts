import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/studio',
  plugins: [
    tsconfigPaths({
      root: import.meta.dirname,
      projects: ['../../tsconfig.base.json', './tsconfig.json']
    }),
    // SVG as React components - 使用 ?react 后缀
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: true,
        titleProp: true
      }
    }),
    react()
  ],
  test: {
    name: 'studio',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/libs/studio',
      provider: 'v8' as const
    }
  }
}))
