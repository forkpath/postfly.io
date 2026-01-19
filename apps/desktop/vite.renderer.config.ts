import path from 'node:path'

import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.resolve(__dirname, 'src/renderer'),
  base: './',
  server: {
    port: parseInt(process.env.DESKTOP_PORT as string, 10) || 4200,
    strictPort: true,
    host: 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/api')
      }
    }
  },
  plugins: [
    devtools(),
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, 'src/renderer/app'),
      generatedRouteTree: path.resolve(__dirname, 'src/renderer/routeTree.gen.ts')
    }),
    viteReact()
  ],
  build: {
    outDir: path.resolve(__dirname, '.vite/renderer'),
    emptyOutDir: true
  },
  clearScreen: false
})
