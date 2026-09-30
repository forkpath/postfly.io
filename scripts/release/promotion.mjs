import assert from 'node:assert/strict'
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const services = ['engine', 'web', 'pulse', 'worker', 'migrator']

export function releaseTarget(env) {
  const environment = env.RELEASE_ENVIRONMENT || 'production'
  const commit = env.RELEASE_COMMIT || env.GITHUB_SHA
  const repository = env.GITHUB_REPOSITORY
  assert.match(commit ?? '', /^[a-f0-9]{40}$/, 'Release requires a full commit SHA')
  assert.match(repository ?? '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, 'Invalid repository')
  assert.equal(commit, env.GITHUB_SHA, 'Release must use the triggering commit')
  if (environment === 'staging') {
    assert.equal(env.GITHUB_EVENT_NAME, 'push', 'Staging runs after dev push CI')
    assert.equal(env.GITHUB_REF, 'refs/heads/dev', 'Staging requires dev')
    assert.equal(env.GITHUB_WORKFLOW, 'CI', 'Staging must be called by CI')
  } else {
    assert.equal(environment, 'production', 'Unknown deployment environment')
    assert.ok(['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME), 'Invalid production event')
    assert.equal(env.GITHUB_REF, 'refs/heads/main', 'Production requires main')
  }
  return { environment, commit, repository, prefix: `ghcr.io/${repository.toLowerCase()}` }
}

export function verifyStagingRun(run, target) {
  assert.equal(run?.path, '.github/workflows/ci.yml', 'Receipt must originate in CI')
  assert.equal(run.repository?.full_name, target.repository, 'Wrong source repository')
  assert.equal(run.head_repository?.full_name, target.repository, 'Fork runs cannot deploy')
  assert.equal(run.event, 'push', 'PR results cannot authorize production')
  assert.equal(run.head_branch, 'dev', 'Receipt must originate on dev')
  assert.equal(run.head_sha, target.commit, 'Production commit has not been tested on dev')
  assert.equal(run.status, 'completed', 'Dev CI and deployment are still running')
  assert.equal(run.conclusion, 'success', 'Dev CI or staging deployment failed')
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0, 'Invalid source run ID')
  assert.ok(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, 'Invalid source run attempt')
  return run
}

export function verifyReceipt(receipt, target, run) {
  assert.ok(Number.isSafeInteger(run.id) && run.id > 0, 'Invalid source run ID')
  assert.ok(Number.isSafeInteger(run.run_attempt) && run.run_attempt > 0, 'Invalid source run attempt')
  assert.equal(receipt.version, 1, 'Unsupported release receipt')
  assert.equal(receipt.repository, target.repository, 'Wrong receipt repository')
  assert.equal(receipt.commit, target.commit, 'Receipt belongs to another commit')
  assert.equal(receipt.runId, run.id, 'Receipt belongs to another workflow run')
  assert.equal(receipt.runAttempt, run.run_attempt, 'Receipt belongs to an earlier attempt')
  assert.equal(receipt.environment, 'staging', 'Only a staging receipt may be promoted')
  assert.deepEqual(
    Object.keys(receipt.images ?? {}).sort(),
    [...services].sort(),
    'Receipt must include all five images'
  )
  for (const service of services) {
    const reference = receipt.images[service]
    assert.equal(typeof reference, 'string', 'Invalid image reference')
    const [name, digest, extra] = reference.split('@')
    assert.equal(name, `${target.prefix}/${service}`, 'Image comes from another repository')
    assert.match(digest ?? '', /^sha256:[a-f0-9]{64}$/, 'Mutable tags cannot be deployed')
    assert.equal(extra, undefined, 'Invalid image reference')
  }
  return receipt.images
}

export function githubClient(env) {
  assert.ok(env.GITHUB_TOKEN, 'GITHUB_TOKEN is required')
  const base = env.GITHUB_API_URL || 'https://api.github.com'
  return async path => {
    const response = await fetch(`${base}/repos/${env.GITHUB_REPOSITORY}/${path}`, {
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok) throw new Error(`GitHub ${response.status}: ${path.split('?')[0]}`)
    return response.json()
  }
}

export async function verifyHead(api, target) {
  const branch = target.environment === 'staging' ? 'dev' : 'main'
  const head = await api(`git/ref/heads/${branch}`)
  assert.equal(head.object?.sha, target.commit, `${branch} advanced; refusing an obsolete deployment`)
}

export async function findStagingReceipt(api, target) {
  const query = new URLSearchParams({ branch: 'dev', event: 'push', head_sha: target.commit, per_page: '100' })
  const response = await api(`actions/workflows/ci.yml/runs?${query}`)
  // Do not search only successful runs: a newer failed/running attempt must not
  // silently fall back to an older green deployment of the same commit.
  const latest = response.workflow_runs?.toSorted((a, b) => b.id - a.id)[0]
  assert.ok(latest, 'No dev CI exists for this exact commit; promote dev with a fast-forward')
  const run = verifyStagingRun(latest, target)
  const result = await api(`actions/runs/${run.id}/artifacts?per_page=100`)
  const artifacts = result.artifacts?.filter(item => item.name === `staging-release-${target.commit}`) ?? []
  assert.equal(artifacts.length, 1, 'No unique staging deployment receipt; rerun dev deployment')
  const artifact = artifacts[0]
  assert.equal(artifact.expired, false, 'Staging receipt expired; rerun dev deployment')
  assert.ok(Number.isSafeInteger(artifact.id) && artifact.id > 0, 'Invalid artifact ID')
  return { run, artifact }
}

export function deploymentConfig(env) {
  for (const name of ['DEPLOY_HOST', 'DEPLOY_USER', 'DEPLOY_SSH_KEY', 'GHCR_TOKEN', 'PUBLIC_ORIGIN']) {
    assert.ok(env[name]?.trim(), `Configure ${name} in the selected GitHub Environment`)
  }
  assert.match(env.DEPLOY_HOST_FINGERPRINT ?? '', /^SHA256:[A-Za-z0-9+/]{43}=?$/, 'Configure the SSH host fingerprint')
  assert.match(
    env.DEPLOY_PATH ?? '',
    /^\/(?:[A-Za-z0-9_-][A-Za-z0-9_.-]*\/)*[A-Za-z0-9_-][A-Za-z0-9_.-]*$/,
    'Invalid DEPLOY_PATH'
  )
  const port = Number(env.DEPLOY_PORT || 22)
  assert.ok(Number.isInteger(port) && port > 0 && port <= 65535, 'Invalid DEPLOY_PORT')
  const origin = new URL(env.PUBLIC_ORIGIN)
  assert.equal(origin.protocol, 'https:', 'Public deployments require HTTPS')
  assert.equal(
    origin.origin,
    env.PUBLIC_ORIGIN,
    'PUBLIC_ORIGIN must be an origin without credentials, path or trailing slash'
  )
}

function output(values) {
  assert.ok(process.env.GITHUB_OUTPUT, 'GITHUB_OUTPUT is required')
  for (const [name, value] of Object.entries(values)) appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`)
}

async function main(command) {
  const env = process.env
  const target = releaseTarget(env)
  if (command === 'config') {
    deploymentConfig(env)
    return
  }
  if (command === 'validate') {
    const receipt = JSON.parse(readFileSync('dist/release/release.json', 'utf8'))
    const images = verifyReceipt(receipt, target, {
      id: Number(env.SOURCE_RUN_ID),
      run_attempt: Number(env.SOURCE_RUN_ATTEMPT)
    })
    output(images)
    return
  }
  if (command === 'receipt') {
    assert.equal(target.environment, 'staging', 'Only staging can issue a receipt')
    const run = { id: Number(env.GITHUB_RUN_ID), run_attempt: Number(env.GITHUB_RUN_ATTEMPT) }
    const receipt = {
      version: 1,
      repository: target.repository,
      commit: target.commit,
      environment: 'staging',
      runId: run.id,
      runAttempt: run.run_attempt,
      images: JSON.parse(env.RELEASE_IMAGES)
    }
    verifyReceipt(receipt, target, run)
    mkdirSync('dist/release', { recursive: true })
    writeFileSync('dist/release/release.json', JSON.stringify(receipt, null, 2) + '\n')
    return
  }
  assert.ok(['resolve', 'head'].includes(command), 'Unknown promotion command')
  const api = githubClient(env)
  await verifyHead(api, target)
  if (command === 'head') return
  output(target)
  if (target.environment === 'production') {
    const { run, artifact } = await findStagingReceipt(api, target)
    output({ source_run: run.id, source_attempt: run.run_attempt, artifact_id: artifact.id })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main(process.argv[2])
