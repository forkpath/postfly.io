import assert from 'node:assert/strict'
import { test } from 'node:test'

import { agentEnvironment } from './agent-environment.mjs'

test('evaluation environment supports only the two Agents and excludes unrelated credentials', () => {
  const source = {
    PATH: '/bin',
    HOME: '/fixture',
    ANTHROPIC_AUTH_TOKEN: 'fixture-token',
    ANTHROPIC_BASE_URL: 'https://provider.invalid',
    ANTHROPIC_MODEL: 'configured-model',
    CURSOR_API_KEY: 'cursor-fixture',
    POSTGRES_DATABASE_URL: 'production-must-not-pass',
    GITHUB_TOKEN: 'must-not-pass'
  }
  assert.throws(() => agentEnvironment('claude', source), /Unsupported Agent/)
  assert.throws(() => agentEnvironment('unknown', source), /Unsupported Agent/)
  assert.equal(agentEnvironment('cursor', source).CURSOR_API_KEY, source.CURSOR_API_KEY)
  for (const agent of ['codex', 'cursor']) {
    const env = agentEnvironment(agent, source)
    assert.equal(env.POSTGRES_DATABASE_URL, undefined)
    assert.equal(env.GITHUB_TOKEN, undefined)
    assert.equal(env.ANTHROPIC_AUTH_TOKEN, undefined)
    assert.equal(env.ANTHROPIC_BASE_URL, undefined)
    assert.equal(env.ANTHROPIC_MODEL, undefined)
    if (agent !== 'cursor') assert.equal(env.CURSOR_API_KEY, undefined)
  }
})
