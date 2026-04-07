import { fileURLToPath } from 'url'

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: async () => {
    const { appConfig } = await import('./src/config/app')
    return {
      name: appConfig.name,
      permissions: ['storage', 'cookies', 'sidePanel'],
      host_permissions: ['<all_urls>']
    }
  },
  dev: {
    server: {
      port: 1234
    }
  },
  webExt: {
    disabled: true
  },
  srcDir: 'src',
  entrypointsDir: 'app',
  outDir: 'build',
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  imports: false,
  vite: () => ({
    plugins: [nxViteTsPaths(), tailwindcss(), svgr({ include: '**/*.svg' })],
    optimizeDeps: {
      exclude: ['*/build']
    },
    resolve: {
      dedupe: ['react', 'react-dom']
    },
    define: {
      'process.env': Object.fromEntries(Object.entries(import.meta.env).filter(([key]) => key.toLowerCase() !== 'path'))
    },
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url))
    }
  })
})
