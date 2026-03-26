/// <reference types='vitest' />
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin'
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

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
    // 保证这个插件在最前面
    nxViteTsPaths(),
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
    tanstackStart({
      srcDirectory: './src',
      router: {
        quoteStyle: 'single'
      }
    }),
    viteReact(),
    tailwindcss()
  ],
  // SSR 配置 - 确保所有 libs 在 SSR 时也能被正确处理
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
