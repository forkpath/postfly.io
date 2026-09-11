import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Discover dedicated test configs only. App build plugins (Start, Nitro,
    // Electron, Expo, WXT) must not run merely to collect unit tests.
    // A glob is not coverage: apps still need a config and real test cases.
    projects: [
      'apps/**/vitest.config.{mjs,js,ts,mts}',
      'libs/**/vitest.config.{mjs,js,ts,mts}',
      'services/**/vitest.config.{mjs,js,ts,mts}'
    ]
  }
})
