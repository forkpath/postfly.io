import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const swcRequire = createRequire(require.resolve('@swc/cli'))
const wrapperRequire = createRequire(swcRequire.resolve('@xhmikosr/bin-wrapper'))
const downloaderRequire = createRequire(wrapperRequire.resolve('@xhmikosr/downloader'))
const gotPath = downloaderRequire.resolve('got')
const gotRequire = createRequire(gotPath)
const cacheRequire = createRequire(gotRequire.resolve('cacheable-request'))
const CachePolicy = cacheRequire('http-cache-semantics')
const request = (headers = {}) => ({ url: 'https://cache.example.invalid/resource', headers })
const policy = (headers, options, requestHeaders = {}) =>
  new CachePolicy(request(requestHeaders), { status: 200, headers }, options)

const restricted = [
  ['shared cookie', { 'set-cookie': ['session=synthetic-user-a'], 'cache-control': 'max-age=60' }],
  ['proxy-revalidate', { 'cache-control': 'max-age=60, proxy-revalidate' }],
  ['no-cache', { 'cache-control': 'max-age=60, no-cache' }],
  ['no-store', { 'cache-control': 'max-age=60, no-store' }],
  ['private shared response', { 'cache-control': 'max-age=60, private' }],
  ['must-revalidate', { 'cache-control': 'max-age=60, must-revalidate' }]
]

for (const [name, headers] of restricted) {
  test(`max-stale cannot override ${name}, including after serialization`, () => {
    const original = policy(headers)
    for (const cached of [original, CachePolicy.fromObject(JSON.parse(JSON.stringify(original.toObject())))]) {
      for (const directive of ['max-stale', 'max-stale=3600']) {
        const incoming = request({ 'cache-control': directive, cookie: 'session=synthetic-user-b' })
        assert.equal(cached.satisfiesWithoutRevalidation(incoming), false)
        const result = cached.evaluateRequest(incoming)
        assert.equal(result.response, undefined)
        assert.equal(result.revalidation.synchronous, true)
      }
    }
  })
}

test('authorization restrictions cannot be overridden by max-stale', () => {
  const cached = policy({ 'cache-control': 'max-age=60' }, {}, { authorization: 'Bearer synthetic' })
  assert.equal(cached.satisfiesWithoutRevalidation(request({ 'cache-control': 'max-stale' })), false)
})

test('stale-while-revalidate cannot serve a restricted shared cookie response', () => {
  const cached = policy({
    'set-cookie': ['session=synthetic'],
    'cache-control': 'max-age=60, stale-while-revalidate=600'
  })
  const result = cached.evaluateRequest(request())
  assert.equal(result.response, undefined)
  assert.equal(result.revalidation.synchronous, true)
})

test('ordinary fresh responses and explicit cookie sharing remain cache hits', () => {
  for (const headers of [
    { 'cache-control': 'max-age=60' },
    { 'set-cookie': ['preference=synthetic'], 'cache-control': 'public, max-age=60' },
    { 'set-cookie': ['preference=synthetic'], 'cache-control': 'immutable, max-age=60' }
  ]) {
    assert.equal(policy(headers).satisfiesWithoutRevalidation(request()), true)
  }
})

test('private caches can reuse private cookies and ignore proxy-only restrictions', () => {
  for (const directive of ['private', 'proxy-revalidate']) {
    const cached = policy(
      { 'set-cookie': ['session=synthetic'], 'cache-control': `max-age=60, ${directive}` },
      { shared: false }
    )
    assert.equal(cached.satisfiesWithoutRevalidation(request()), true)
  }
})

test('ordinary stale reuse respects max-stale bounds and request no-cache', () => {
  const cached = policy({ 'cache-control': 'public, max-age=60', age: '120' })
  assert.equal(cached.satisfiesWithoutRevalidation(request()), false)
  assert.equal(cached.satisfiesWithoutRevalidation(request({ 'cache-control': 'max-stale' })), true)
  assert.equal(cached.satisfiesWithoutRevalidation(request({ 'cache-control': 'max-stale=120' })), true)
  assert.equal(cached.satisfiesWithoutRevalidation(request({ 'cache-control': 'max-stale=30' })), false)
  assert.equal(cached.satisfiesWithoutRevalidation(request({ 'cache-control': 'no-cache, max-stale' })), false)
})

test('Vary and conditional revalidation still enforce the original request contract', () => {
  const cached = policy(
    { 'cache-control': 'max-age=60', vary: 'accept-language', etag: '"synthetic"', age: '120' },
    {},
    { 'accept-language': 'en' }
  )
  assert.equal(
    cached.satisfiesWithoutRevalidation(request({ 'accept-language': 'fr', 'cache-control': 'max-stale' })),
    false
  )
  const incoming = request({ 'accept-language': 'en' })
  assert.equal(cached.revalidationHeaders(incoming)['if-none-match'], '"synthetic"')
  const updated = cached.revalidatedPolicy(incoming, { status: 304, headers: { etag: '"synthetic"', age: '0' } })
  assert.equal(updated.modified, false)
  assert.equal(updated.policy.satisfiesWithoutRevalidation(incoming), true)
})

test(
  'the SWC downloader HTTP client preserves normal caching and isolates user cookies',
  { timeout: 10000 },
  async t => {
    const { default: got } = await import(pathToFileURL(gotPath).href)
    const hits = new Map()
    const server = createServer((req, res) => {
      hits.set(req.url, (hits.get(req.url) ?? 0) + 1)
      res.setHeader('cache-control', 'max-age=60')
      if (req.url === '/cookie') res.setHeader('set-cookie', [`session=${req.headers['x-fixture-user']}`])
      res.end(req.url === '/cookie' ? req.headers['x-fixture-user'] : 'public fixture')
    })
    t.after(
      () =>
        new Promise(resolve => {
          server.closeAllConnections()
          server.close(resolve)
        })
    )
    server.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = `http://127.0.0.1:${server.address().port}`
    const client = got.extend({ cache: new Map(), retry: { limit: 0 }, timeout: { request: 3000 } })
    assert.equal(await client(`${base}/public`).text(), 'public fixture')
    assert.equal(await client(`${base}/public`).text(), 'public fixture')
    assert.equal(hits.get('/public'), 1)
    assert.equal(await client(`${base}/cookie`, { headers: { 'x-fixture-user': 'user-a' } }).text(), 'user-a')
    const second = await client(`${base}/cookie`, {
      headers: { 'x-fixture-user': 'user-b', 'cache-control': 'max-stale' }
    })
    assert.equal(second.body, 'user-b')
    assert.deepEqual(second.headers['set-cookie'], ['session=user-b'])
    assert.equal(hits.get('/cookie'), 2)
  }
)
