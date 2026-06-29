import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/web/vite.config.mts',
      'libs/ui-shared/vite.config.mts',
      'libs/**/vitest.config.{mjs,js,ts,mts}',
      'services/**/vitest.config.{mjs,js,ts,mts}'
    ]
  }
})
