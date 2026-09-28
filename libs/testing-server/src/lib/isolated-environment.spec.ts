import { describe, expect, it } from 'vitest'

import { assertIsolatedTestEnvironment } from './isolated-environment'

describe('isolated database guard', () => {
  const runId = '0123456789abcdef'
  const database = `ray_test_${runId}`
  const env = {
    RAY_TEST_RUN_ID: runId,
    POSTGRES_DATABASE_URL: `postgresql://ray_test:secret@127.0.0.1:54321/${database}`
  }

  it('allows the runner database', () => {
    expect(() => assertIsolatedTestEnvironment(env)).not.toThrow()
  })

  it.each([
    {},
    { ...env, RAY_TEST_RUN_ID: 'invalid' },
    { ...env, POSTGRES_DATABASE_URL: `postgresql://db.example.invalid/${database}` },
    { ...env, POSTGRES_DATABASE_URL: 'postgresql://127.0.0.1/development' },
    { ...env, POSTGRES_DATABASE_URL: `https://127.0.0.1/${database}` },
    { ...env, POSTGRES_DATABASE_URL: 'not a URL' }
  ])('rejects a missing or unrelated database %#', input => {
    expect(() => assertIsolatedTestEnvironment(input)).toThrow()
  })
})
