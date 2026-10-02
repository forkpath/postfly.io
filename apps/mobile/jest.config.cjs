const path = require('node:path')

const { compilerOptions } = require('./tsconfig.json')

/** @type {import('jest').Config} */
module.exports = {
  displayName: 'mobile',
  rootDir: __dirname,
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.spec.[jt]s?(x)'],
  clearMocks: true,
  restoreMocks: true,
  // Map the same public entry points as Metro, without leaking Jest into app TS.
  moduleNameMapper: Object.fromEntries(
    Object.entries(compilerOptions.paths).map(([alias, [target]]) => [
      `^${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '(.*)')}$`,
      path.resolve(__dirname, '../..', target).replace('*', '$1')
    ])
  ),
  // jest-expo 57 handles pnpm paths and excludes the Babel plugins themselves.
  transformIgnorePatterns: require('jest-expo/jest-preset').transformIgnorePatterns,
  maxWorkers: 2,
  testTimeout: 15000,
  coverageDirectory: '../../coverage/apps/mobile',
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/app/**', '!src/**/*.d.ts'],
  reporters: [
    'default',
    ['jest-junit', { outputDirectory: '../../dist/test-results/mobile/unit', outputName: 'junit.xml' }]
  ]
}
