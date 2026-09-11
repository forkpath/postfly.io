import { builtinModules } from 'node:module'
import path from 'node:path'

import { defineConfig } from 'vite'

const external = [
  'electron',
  'electron-squirrel-startup',
  ...builtinModules,
  ...builtinModules.map(module => `node:${module}`)
]

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      '@main': path.resolve(__dirname, 'src/main')
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.cjs'
    },
    outDir: path.resolve(__dirname, '.vite/main'),
    emptyOutDir: true,
    rolldownOptions: {
      external
    }
  },
  define:
    mode === 'bundle'
      ? {
          MAIN_WINDOW_VITE_DEV_SERVER_URL: 'undefined',
          MAIN_WINDOW_VITE_NAME: JSON.stringify('.')
        }
      : undefined,
  // do not remove logs when HMR
  clearScreen: false
}))
