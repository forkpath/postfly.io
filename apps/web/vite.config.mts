import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig(async ({ command }) => {
  const plugins = [
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
    viteReact(),
    tailwindcss()
  ]

  if (command === 'build') {
    const { nitro } = await import('nitro/vite')
    plugins.splice(3, 0, nitro({ preset: 'node-server' }))
  }

  return {
    root: import.meta.dirname,
    envDir: '../../',
    cacheDir: '../../node_modules/.vite/apps/web',
    server: {
      port: parseInt(process.env.WEB_PORT as string, 10) || 3000,
      host: '0.0.0.0',
      allowedHosts: ['localhost', new URL(process.env.PUBLIC_ORIGIN || 'http://localhost').hostname],
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api/, '/api')
        }
      }
    },
    preview: {
      port: 3000,
      host: 'localhost'
    },
    resolve: { tsconfigPaths: true },
    plugins,
    ssr: {
      noExternal: [
        '@libs/studio',
        '@libs/auth-contract',
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
    }
  }
})
