/// <reference types='vitest' />
import { resolve } from 'node:path'

import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

const isDev = process.env.NODE_ENV !== 'production'

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/web',
  server: {
    port: parseInt(process.env.WEB_PORT as string, 10) || 3000,
    host: 'localhost',
    allowedHosts: ['localhost', 'postfly.io'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/api')
      }
    }
  },
  preview: {
    port: 3000,
    host: 'localhost'
  },
  plugins: [
    nxViteTsPaths(),
    nxCopyAssetsPlugin(['*.md']),
    devtools(),
    svgr({
      svgrOptions: {
        exportType: 'default',
        ref: true,
        svgo: true,
        titleProp: true
      }
    }),
    tanstackStart({
      srcDirectory: './src',
      router: {
        quoteStyle: 'single'
      }
    }),
    nitro({
      preset: isDev ? undefined : 'node-server',
      output: isDev
        ? undefined
        : { dir: resolve(import.meta.dirname, '../../dist/apps/web') }
    }),
    viteReact(),
    tailwindcss()
  ],
  ssr: {
    noExternal: [
      '@libs/ui-shared',
      '@libs/studio',
      '@libs/auth',
      '@libs/i18n',
      '@libs/common',
      '@libs/api-client',
      /^@libs\/.*/
    ]
  },
  build: {
    outDir: '../../dist/apps/web',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true
    }
  },
  test: {
    name: 'web',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/apps/web',
      provider: 'v8'
    }
  }
}))
