import { builtinModules } from 'node:module'
import path from 'node:path'

import { defineConfig } from 'vite'

const external = ['electron', ...builtinModules, ...builtinModules.map(module => `node:${module}`)]

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main/preload.ts'),
      formats: ['cjs'],
      // fileName 返回不带扩展名的名称，Vite 会根据 format 添加 .cjs
      fileName: () => 'preload'
    },
    outDir: path.resolve(__dirname, '.vite/main'),
    emptyOutDir: false,
    rollupOptions: {
      external,
      output: {
        // 强制使用 .cjs 扩展名
        entryFileNames: 'preload.cjs'
      }
    }
  },
  clearScreen: false
})
