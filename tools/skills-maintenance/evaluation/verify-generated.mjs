// 独立验收器：在生成结束后运行，不向生成提示提供实现或隐藏断言。
import 'reflect-metadata'

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

import { Pool } from 'pg'
import WebSocket from 'ws'

import { inspectLayers } from '../layers.mjs'
import { provision } from './infra.mjs'
import { identity, initialize } from './support.mjs'

const require = createRequire(import.meta.url)
const workspace = resolve(process.argv[2] ?? '')
const scenario = process.argv[3]
if (!existsSync(join(workspace, 'EVALUATION-ISOLATION.json')) || !['REST', 'WS', 'MIXED'].includes(scenario))
  throw new Error('Confirmed isolated workspace and scenario required')
const evidence = { scenario, workspace, checks: [], passed: false }
async function check(name, fn) {
  try {
    await fn()
    evidence.checks.push({ name, passed: true })
  } catch (e) {
    evidence.checks.push({ name, passed: false, error: e.message })
  }
}
let infra, pool, app, second
const sockets = []
try {
  infra = await provision()
  pool = new Pool({ connectionString: infra.databaseUrl })
  const auth = await initialize(pool)
  const owner = await identity(auth, pool, 'owner@example.test'),
    member = await identity(auth, pool, 'member@example.test'),
    stranger = await identity(auth, pool, 'stranger@example.test')
  const org = await auth.api.createOrganization({
    headers: new Headers({ cookie: owner.cookie }),
    body: { name: 'Evaluation organization', slug: 'evaluation-org' }
  })
  await pool.query('INSERT INTO "member" (id,"organizationId","userId",role,"createdAt") VALUES ($1,$2,$3,$4,now())', [
    randomUUID(),
    org.id,
    member.userId,
    'member'
  ])
  const root = join(workspace, 'tools/skill-evaluation/src')
  await check('internal architecture dependencies', () =>
    assert.deepEqual(inspectLayers(root, { requireStructure: true }), [])
  )
  const ts = require('typescript')
  require('@swc-node/register/register').register({
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    esModuleInterop: true
  })
  const { start } = require(join(root, 'bootstrap.ts'))
  const options = { port: 0, pool, auth, redisUrl: infra.redisUrl, channelNamespace: 'evaluation:' + randomUUID() }
  app = await start(options)
  const request = (path, actor, method = 'GET', body) =>
    fetch(app.url + path, {
      method,
      headers: { ...(actor ? { cookie: actor.cookie } : {}), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000)
    })
  const personal = '/api/v1/evaluation/items',
    organization = '/api/v1/evaluation/organizations/' + org.id + '/items'
  let personalId, orgId
  if (scenario !== 'WS') {
    await check('HTTP denies anonymous', async () => assert.equal((await request(personal)).status, 401))
    await check('HTTP validates DTO at real route', async () => {
      for (const body of [
        { title: '' },
        { title: ' ' },
        { title: 'x'.repeat(101) },
        { title: 'ok', owner_user_id: stranger.userId },
        { title: 5 }
      ])
        assert.equal((await request(personal, owner, 'POST', body)).status, 400)
    })
    await check('HTTP persists owner item and preserves wire envelope', async () => {
      const response = await request(personal, owner, 'POST', { title: 'Private item' })
      assert.ok(response.ok)
      const payload = await response.json()
      assert.equal(payload.code, 0)
      assert.equal(payload.msg, 'ok')
      assert.equal(payload.data.title, 'Private item')
      personalId = payload.data.id
      const record = (await pool.query('select * from evaluation_items where id=$1', [personalId])).rows[0]
      assert.equal(record.owner_user_id, owner.userId)
      assert.equal(record.organization_id, null)
    })
    await check('HTTP cross-user list and delete isolation', async () => {
      const payload = await (await request(personal, stranger)).json()
      assert.equal(payload.data.total, 0)
      assert.deepEqual(payload.data.list, [])
      assert.ok([403, 404].includes((await request(personal + '/' + personalId, stranger, 'DELETE')).status))
      assert.equal(
        (await pool.query('select count(*)::int as n from evaluation_items where id=$1', [personalId])).rows[0].n,
        1
      )
    })
    await check('HTTP organization authorization and read-only role', async () => {
      assert.ok([403, 404].includes((await request(organization, stranger)).status))
      assert.ok([403, 404].includes((await request(organization, member, 'POST', { title: 'Denied' })).status))
      const created = await request(organization, owner, 'POST', { title: 'Organization item' })
      assert.ok(created.ok)
      orgId = (await created.json()).data.id
      const list = await (await request(organization, member)).json()
      assert.equal(list.data.total, 1)
      assert.equal(list.data.list[0].id, orgId)
      assert.ok([403, 404].includes((await request(organization + '/' + orgId, member, 'DELETE')).status))
    })
    await check('HTTP scope cannot delete personal item via organization path', async () =>
      assert.ok([403, 404].includes((await request(organization + '/' + personalId, owner, 'DELETE')).status))
    )
    await check('HTTP owner can delete own resource', async () =>
      assert.ok([200, 204].includes((await request(personal + '/' + personalId, owner, 'DELETE')).status))
    )
  }
  if (scenario !== 'REST') {
    second = await start({ ...options, port: 0 })
    const connect = (url, actor) =>
      new Promise((done, reject) => {
        const socket = new WebSocket(url, {
          headers: { Origin: 'http://localhost:18080', ...(actor ? { cookie: actor.cookie } : {}) }
        })
        sockets.push(socket)
        socket.messages = []
        socket.on('message', raw => {
          try {
            socket.messages.push(JSON.parse(raw.toString()))
          } catch {
            /* Invalid server JSON is retained as absence of a valid expected message. */
          }
        })
        socket.on('error', () => {
          /* Connection promise handles handshake errors. */
        })
        const timer = setTimeout(() => {
          socket.terminate()
          reject(new Error('WS connect timeout'))
        }, 2000)
        socket.once('open', () => {
          clearTimeout(timer)
          done(socket)
        })
        socket.once('error', e => {
          clearTimeout(timer)
          reject(e)
        })
      })
    const send = (socket, type, payload) => {
      const id = randomUUID()
      socket.send(JSON.stringify({ version: 1, id, type, payload }))
      return id
    }
    const waitFor = async (socket, predicate, ms = 2000) => {
      const end = Date.now() + ms
      while (Date.now() < end) {
        const found = socket.messages.find(predicate)
        if (found) return found
        await delay(20)
      }
      throw new Error('Expected WS message not received')
    }
    await check('WS rejects unauthenticated connection', async () => {
      let socket
      try {
        socket = await connect(app.wsUrl)
      } catch {
        return
      }
      await delay(100)
      assert.notEqual(socket.readyState, WebSocket.OPEN)
    })
    const a = await connect(app.wsUrl, owner),
      b = await connect(second.wsUrl, member),
      c = await connect(second.wsUrl, stranger)
    await check('WS denies cross-organization subscription', async () => {
      const id = send(c, 'subscribe', { organizationId: org.id })
      assert.equal((await waitFor(c, m => m.correlationId === id)).type, 'error')
    })
    await check('WS authorized subscription has correlated ack', async () => {
      for (const socket of [a, b]) {
        const id = send(socket, 'subscribe', { organizationId: org.id })
        assert.equal((await waitFor(socket, m => m.correlationId === id)).type, 'ack')
      }
    })
    await check('WS uses Redis across instances and server actor', async () => {
      const id = send(a, 'platform.smoke', { organizationId: org.id, text: 'cross-instance' })
      const event = await waitFor(b, m => m.type === 'platform.smoke' && m.correlationId === id)
      assert.equal(event.actor.userId, owner.userId)
      assert.equal(event.actor.organizationId, org.id)
      assert.equal(event.payload.text, 'cross-instance')
      await delay(100)
      assert.equal(c.messages.filter(m => m.type === 'platform.smoke').length, 0)
    })
    await check('WS member cannot publish', async () => {
      const id = send(b, 'platform.smoke', { organizationId: org.id, text: 'forbidden' })
      assert.equal((await waitFor(b, m => m.correlationId === id)).type, 'error')
    })
    await check('WS rejects unknown version', async () => {
      const id = randomUUID()
      a.send(JSON.stringify({ version: 999, id, type: 'subscribe', payload: { organizationId: org.id } }))
      assert.equal((await waitFor(a, m => m.correlationId === id)).type, 'error')
    })
    await check('WS rejects forged actor and unknown message type', async () => {
      const socket = await connect(app.wsUrl, owner)
      for (const message of [
        { type: 'unrecognized', payload: {} },
        {
          type: 'platform.smoke',
          actor: { userId: stranger.userId },
          payload: { organizationId: org.id, text: 'forged' }
        }
      ]) {
        const id = randomUUID()
        socket.send(JSON.stringify({ version: 1, id, ...message }))
        assert.equal((await waitFor(socket, m => m.correlationId === id)).type, 'error')
      }
      socket.close()
    })
    await check('WS rejects malformed JSON and oversized frames', async () => {
      for (const invalid of ['{', 'x'.repeat(65537)]) {
        const socket = await connect(app.wsUrl, owner)
        socket.send(invalid)
        await delay(250)
        assert.ok(socket.readyState !== WebSocket.OPEN || socket.messages.some(m => m.type === 'error'))
        socket.close()
      }
    })
    await check('WS unsubscribe stops later delivery', async () => {
      const socket = await connect(second.wsUrl, owner)
      let id = send(socket, 'subscribe', { organizationId: org.id })
      await waitFor(socket, m => m.type === 'ack' && m.correlationId === id)
      id = send(socket, 'unsubscribe', { organizationId: org.id })
      await waitFor(socket, m => m.type === 'ack' && m.correlationId === id)
      const event = send(a, 'platform.smoke', { organizationId: org.id, text: 'after-unsubscribe' })
      await waitFor(a, m => m.type === 'ack' && m.correlationId === event)
      await delay(200)
      assert.equal(
        socket.messages.some(m => m.type === 'platform.smoke' && m.correlationId === event),
        false
      )
      socket.close()
    })
    await check('WS membership revocation stops later broadcast', async () => {
      await pool.query('DELETE FROM "member" WHERE "organizationId"=$1 AND "userId"=$2', [org.id, member.userId])
      await delay(600)
      const id = send(a, 'platform.smoke', { organizationId: org.id, text: 'after-revocation' })
      await waitFor(a, m => m.type === 'ack' && m.correlationId === id)
      await delay(300)
      assert.equal(
        b.messages.some(m => m.type === 'platform.smoke' && m.correlationId === id),
        false
      )
    })
    await check('WS reconnect rechecks membership', async () => {
      b.close()
      const again = await connect(second.wsUrl, member)
      const id = send(again, 'subscribe', { organizationId: org.id })
      assert.equal((await waitFor(again, m => m.correlationId === id)).type, 'error')
    })
    await check('WS rejects expired session after connection', async () => {
      await pool.query('UPDATE "session" SET "expiresAt"=now()-interval \'1 hour\' WHERE id=$1', [owner.sessionId])
      await delay(600)
      if (a.readyState !== WebSocket.OPEN) return
      const id = send(a, 'platform.smoke', { organizationId: org.id, text: 'expired' })
      const response = await waitFor(a, m => m.correlationId === id).catch(() => null)
      assert.ok(a.readyState !== WebSocket.OPEN || response?.type === 'error')
    })
  }
  evidence.passed = evidence.checks.length > 0 && evidence.checks.every(c => c.passed)
} catch (error) {
  evidence.checks.push({ name: 'verification infrastructure/bootstrap', passed: false, error: error.stack })
} finally {
  for (const socket of sockets) socket.terminate()
  for (const [name, close] of [
    ['second application', () => second?.close()],
    ['application', () => app?.close()],
    ['database pool', () => pool?.end()],
    ['infrastructure', () => infra?.close()]
  ]) {
    try {
      await close()
    } catch (error) {
      evidence.passed = false
      evidence.checks.push({ name: 'cleanup ' + name, passed: false, error: error.message })
    }
  }
  const path = join(workspace, 'verification.json')
  writeFileSync(path, JSON.stringify(evidence, null, 2) + '\n')
  console.log(JSON.stringify(evidence, null, 2))
  if (!evidence.passed) process.exitCode = 1
}
