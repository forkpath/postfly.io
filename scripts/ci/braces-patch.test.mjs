import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const eslintRequire = createRequire(require.resolve('@nx/eslint'))
const jestRequire = createRequire(eslintRequire.resolve('@nx/jest'))
const reportersRequire = createRequire(jestRequire.resolve('@jest/reporters'))
const transformRequire = createRequire(reportersRequire.resolve('@jest/transform'))
const micromatch = transformRequire('micromatch')
const braces = createRequire(transformRequire.resolve('micromatch'))('braces')
const nested = (depth, open = '{', close = '}') => open.repeat(depth) + 'a,b' + close.repeat(depth)

for (const api of ['parse', 'compile', 'expand', 'stringify']) {
  test(`${api} rejects excessive input nesting with a controlled depth error`, () => {
    for (const pattern of [nested(4000), nested(4000, '(', ')'), nested(101), nested(51, '{(', ')}')]) {
      assert.ok(pattern.length < 10000)
      assert.throws(() => braces[api](pattern), { name: 'SyntaxError', message: /exceeds max depth/ })
    }
  })
}

for (const api of ['compile', 'expand', 'stringify']) {
  test(`${api} validates caller-supplied AST depth without relying on the parser`, () => {
    let ast = { type: 'text', value: 'a' }
    for (let i = 0; i < 4000; i++) ast = { type: 'brace', nodes: [ast] }
    ast = { type: 'root', nodes: [ast] }
    assert.throws(() => braces[api](ast), { name: 'RangeError', message: /exceeds max depth/ })
  })
}

test('the allowed boundary works and a larger option cannot disable the security cap', () => {
  for (const api of ['parse', 'compile', 'expand', 'stringify']) {
    assert.doesNotThrow(() => braces[api](nested(100)))
    assert.doesNotThrow(() => braces[api](nested(100, '(', ')')))
    assert.throws(() => braces[api](nested(101), { maxDepth: 10000 }), /exceeds max depth/)
    assert.throws(() => braces[api](nested(3), { maxDepth: 2 }), /exceeds max depth/)
    assert.doesNotThrow(() => braces[api](nested(2), { maxDepth: 2 }))
  }
})

test('ordinary alternatives, ranges, escaping and independent sibling groups still work', () => {
  assert.deepEqual(braces.expand('apps/{web,desktop}/src/*.{ts,tsx}'), [
    'apps/web/src/*.ts',
    'apps/web/src/*.tsx',
    'apps/desktop/src/*.ts',
    'apps/desktop/src/*.tsx'
  ])
  assert.deepEqual(braces.expand('file{1..3}.ts'), ['file1.ts', 'file2.ts', 'file3.ts'])
  assert.equal(braces.compile('{a,b}'), '(a|b)')
  assert.equal(braces.stringify(braces.parse('a/{b,c}/d')), 'a/{b,c}/d')
  assert.doesNotThrow(() => braces.parse('\\{'.repeat(150) + 'a' + '\\}'.repeat(150)))
  assert.doesNotThrow(() => braces.compile('{a,b}'.repeat(150)))
  assert.throws(() => braces.parse('a'.repeat(10001)), /exceeds max characters/)
  assert.throws(() => braces.expand('{1..10000}'), /exceeds range limit/)
})

test('the actual Jest micromatch consumer retains glob expansion and rejects excessive nesting', () => {
  assert.deepEqual(micromatch.braceExpand('**/*.{spec,test}.{ts,tsx}'), [
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/*.test.ts',
    '**/*.test.tsx'
  ])
  assert.deepEqual(micromatch(['a.spec.ts', 'b.test.tsx', 'c.ts'], '**/*.{spec,test}.{ts,tsx}'), [
    'a.spec.ts',
    'b.test.tsx'
  ])
  assert.throws(() => micromatch.braces(nested(4000)), /exceeds max depth/)
  assert.throws(() => micromatch.braceExpand(nested(4000)), /exceeds max depth/)
})
