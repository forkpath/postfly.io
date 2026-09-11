import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/libs/common',
  plugins: [tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] })]
  // Uncomment this if you are using workers.
  // worker: {
  //   plugins: () => [ tsconfigPaths({ root: import.meta.dirname, projects: ['../../tsconfig.base.json'] }) ],
  // },
}))
