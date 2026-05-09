import { builtinModules } from 'node:module'
import path from 'node:path'

import { defineConfig } from 'vite'

const external = [
  'electron',
  'electron-squirrel-startup',
  ...builtinModules,
  ...builtinModules.map(module => `node:${module}`)
]

export default defineConfig({
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
    rollupOptions: {
      external
    }
  },
  // do not remove logs when HMR
  clearScreen: false
})
