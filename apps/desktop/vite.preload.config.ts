import { builtinModules } from 'node:module'
import path from 'node:path'

import { defineConfig } from 'vite'

const external = ['electron', ...builtinModules, ...builtinModules.map(module => `node:${module}`)]

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.cjs'
    },
    outDir: path.resolve(__dirname, '.vite/preload'),
    emptyOutDir: true,
    rollupOptions: {
      external
    }
  },
  clearScreen: false
})
