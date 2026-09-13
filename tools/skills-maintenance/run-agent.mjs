// 显式、有限预算的 Agent 执行器；不会由定时维护调用。
import { execFileSync, spawn } from 'node:child_process'
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Pool } from 'pg'

import { agentEnvironment } from './agent-environment.mjs'
import { SUPPORTED_AGENTS } from './agents.mjs'
import { evaluationBucket } from './budget.mjs'
import { sha256 } from './core.mjs'
import { provision } from './evaluation/infra.mjs'
import { initialize } from './evaluation/support.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const [agent, scenario, version] = process.argv.slice(2)
const retry = process.argv[5] === '--retry'
if (
  !SUPPORTED_AGENTS.includes(agent) ||
  !['REST', 'WS', 'MIXED'].includes(scenario) ||
  !['old', 'new'].includes(version)
)
  throw new Error('Usage: run-agent.mjs codex|cursor REST|WS|MIXED old|new')
const ledgerPath = join(root, 'docs/architecture/skills-agent-evaluations.json')
const lockPath = ledgerPath + '.lock'
let lock
try {
  lock = openSync(lockPath, 'wx')
} catch {
  throw new Error('Evaluation lock held; run sequentially to preserve budget')
}
let infra, pool, record, ledger
try {
  ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'))
  const bucket = evaluationBucket(ledger, agent, scenario, version, retry)
  const snapshot = JSON.parse(
    execFileSync(process.execPath, [join(root, 'tools/skills-maintenance/isolate.mjs'), version], {
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024
    })
  )
  const cwd = snapshot.destination,
    support = join(cwd, 'tools/skill-evaluation-support')
  mkdirSync(support, { recursive: true })
  for (const file of ['task.md', 'contract.md', 'support.mjs'])
    cpSync(join(root, 'tools/skills-maintenance/evaluation', file), join(support, file))
  infra = await provision()
  pool = new Pool({ connectionString: infra.databaseUrl })
  await initialize(pool)
  const prompt =
    readFileSync(join(support, 'task.md'), 'utf8') +
    '\n本次协议：' +
    scenario +
    '。\n契约：tools/skill-evaluation-support/contract.md；测试工厂：tools/skill-evaluation-support/support.mjs。\n只需实现本次协议，返回对象中未使用的 URL 可为空。'
  const executable = agent === 'cursor' ? 'cursor-agent' : agent
  const cliVersion = execFileSync(executable, ['--version'], { encoding: 'utf8' }).trim()
  let model = 'configured default',
    reasoning
  const codexConfig = join(process.env.HOME, '.codex/config.toml')
  if (agent === 'codex' && existsSync(codexConfig)) {
    const config = readFileSync(codexConfig, 'utf8')
    model = config.match(/^model\s*=\s*"([^"]+)"/m)?.[1] ?? model
    reasoning = config.match(/^model_reasoning_effort\s*=\s*"([^"]+)"/m)?.[1]
  }
  const args =
    agent === 'codex'
      ? ['exec', '--ignore-user-config', '--sandbox', 'workspace-write', '--ephemeral', '--json', '-C', cwd, '-']
      : ['--print', '--sandbox', 'enabled', '--workspace', cwd, '--output-format', 'stream-json']
  if (model !== 'configured default') args.push('--model', model)
  if (agent === 'codex' && reasoning) args.push('-c', 'model_reasoning_effort="' + reasoning + '"')
  if (agent === 'codex') args.push('-c', 'shell_environment_policy.inherit="all"')
  if (agent === 'codex') args.push('-c', 'sandbox_workspace_write.network_access=true')
  record = {
    id: ledger.runs.length + ledger.retryRuns.length + 1,
    retry,
    agent,
    scenario,
    version,
    baseline: snapshot.baseline,
    skillDigests: snapshot.skillDigests,
    promptDigest: sha256(prompt),
    contractDigest: sha256(readFileSync(join(support, 'contract.md'))),
    cliVersion,
    model,
    reasoning: reasoning ?? 'default',
    workspace: cwd,
    status: 'running',
    startedAt: new Date().toISOString(),
    tests: 'pending'
  }
  bucket.push(record)
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  const log = join(cwd, 'agent-output.json')
  const fd = openSync(log, 'wx', 0o600)
  const env = agentEnvironment(agent, process.env)
  Object.assign(env, {
    CI: 'true',
    NX_DAEMON: 'false',
    NX_NO_CLOUD: 'true',
    RAY_EVALUATION_DATABASE_URL: infra.databaseUrl,
    RAY_EVALUATION_REDIS_URL: infra.redisUrl
  })
  console.log(JSON.stringify({ id: record.id, agent, scenario, version, workspace: cwd, model, cliVersion }))
  if (agent === 'cursor') args.push(prompt)
  const child = spawn(executable, args, { cwd, env, stdio: ['pipe', fd, fd], detached: true })
  let timedOut = false
  const timer = setTimeout(
    () => {
      timedOut = true
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        /* Process already exited. */
      }
    },
    15 * 60 * 1000
  )
  child.stdin.end(prompt)
  const result = await new Promise((done, reject) => {
    child.once('error', reject)
    child.once('close', (code, signal) => done({ code, signal }))
  })
  clearTimeout(timer)
  closeSync(fd)
  Object.assign(record, {
    status: timedOut ? 'timeout' : result.code === 0 ? 'generated-awaiting-verification' : 'agent-failed',
    exitCode: result.code,
    signal: result.signal,
    endedAt: new Date().toISOString(),
    log,
    digest: sha256(readFileSync(log))
  })
  console.log(JSON.stringify(record, null, 2))
  if (timedOut || result.code !== 0) process.exitCode = 1
} catch (error) {
  if (record) Object.assign(record, { status: 'blocked', reason: error.message, endedAt: new Date().toISOString() })
  throw error
} finally {
  if (ledger) writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')
  try {
    await pool?.end()
  } finally {
    try {
      infra?.close()
    } finally {
      closeSync(lock)
      unlinkSync(lockPath)
    }
  }
}
