import path from 'node:path'

import { devtools } from '@tanstack/devtools-vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname, '../..'), 'VITE_')
  // Packaged file:// pages have no HTTP origin for Better Auth's default URL.
  const apiEndpoint = env.VITE_API_ENDPOINT || env.VITE_API_BASE_URL || 'http://localhost:8000'
  if (!/^https?:\/\//.test(apiEndpoint)) throw new Error('Desktop API endpoint must be an absolute HTTP(S) URL')
  return {
    define: command === 'build' ? { 'import.meta.env.VITE_API_ENDPOINT': JSON.stringify(apiEndpoint) } : {},
    root: path.resolve(import.meta.dirname, 'src/renderer'),
    envDir: path.resolve(import.meta.dirname, '../..'),
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
    resolve: { tsconfigPaths: true },
    plugins: [
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
        routesDirectory: path.resolve(import.meta.dirname, 'src/renderer/routes'),
        generatedRouteTree: path.resolve(import.meta.dirname, 'src/renderer/routeTree.gen.ts')
      }),
      viteReact(),
      tailwindcss()
    ],
    build: {
      outDir: path.resolve(import.meta.dirname, '.vite/renderer'),
      emptyOutDir: true
    },
    clearScreen: false
  }
})
