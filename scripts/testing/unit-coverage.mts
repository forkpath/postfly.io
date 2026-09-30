import type { CoverageOptions } from 'vitest/node'

import { coverageConfigDefaults } from 'vitest/config'

import thresholds from './unit-coverage-thresholds.json' with { type: 'json' }

interface MinimumCoverage {
  statements: number
  branches: number
  functions: number
  lines: number
}

const minimums: Record<string, MinimumCoverage> = thresholds

export function unitCoverage(projectRoot: string): CoverageOptions {
  const minimum = minimums[projectRoot]
  if (!minimum || !/^(apps|libs|services)\/[a-z0-9-]+$/.test(projectRoot)) {
    throw new Error(`Define a reviewed coverage baseline for ${projectRoot}`)
  }

  return {
    provider: 'v8',
    enabled: process.env['RAY_TEST_COVERAGE'] === 'true',
    reportsDirectory: `../../coverage/${projectRoot}`,
    // Include unimported production files; a green test must not hide missing tests.
    include: ['src/**/*.{ts,tsx,js,jsx,mjs,cjs}'],
    exclude: [
      ...coverageConfigDefaults.exclude,
      '**/*.d.ts',
      '**/*.{spec,test}.*',
      '**/__tests__/**',
      '**/generated/**',
      '**/routeTree.gen.ts'
    ],
    reporter: ['text-summary', 'json-summary', 'html', 'lcov'],
    reportOnFailure: true,
    thresholds: { ...minimum, autoUpdate: false }
  }
}
