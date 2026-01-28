import path from 'node:path'

import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

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
        rewrite: p => p.replace(/^\/api/, '/api')
      }
    }
  },
  plugins: [
    nxViteTsPaths({}),
    nxCopyAssetsPlugin(['*.md']),
    devtools(),
    // SVG as React components - 使用 ?react 后缀
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: true,
        titleProp: true
      }
    }),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, 'src/renderer/routes'),
      generatedRouteTree: path.resolve(__dirname, 'src/renderer/routeTree.gen.ts')
    }),
    viteReact(),
    tailwindcss()
  ],
  build: {
    outDir: path.resolve(__dirname, '.vite/renderer'),
    emptyOutDir: true
  },
  clearScreen: false
})
