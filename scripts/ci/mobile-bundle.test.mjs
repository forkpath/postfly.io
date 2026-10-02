import assert from 'node:assert/strict'
import { test } from 'node:test'

import { verifyMobileBundle } from '../testing/mobile-bundle.mjs'

test('a router runtime without application routes cannot pass bundle verification', () => {
  assert.throws(
    () => verifyMobileBundle({ sources: ['node_modules/expo-router/entry.js', 'node_modules/react/index.js'] }),
    /missing application routes/
  )
})

test('bundle verification requires every framework smoke-test route', () => {
  const sources = [
    '/private/tmp/run/apps/mobile/src/app/_layout.tsx',
    'apps/mobile/src/app/(setup)/welcome.tsx',
    '../../apps/mobile/src/app/(setup)/auth/login.tsx'
  ]
  assert.equal(verifyMobileBundle({ sources }).sourceCount, 3)
  for (let index = 0; index < sources.length; index++)
    assert.throws(() => verifyMobileBundle({ sources: sources.filter((_, position) => position !== index) }), /missing/)
})
