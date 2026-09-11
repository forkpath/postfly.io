#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

function readNumberOption(name, fallback) {
  const prefix = `--${name}=`
  const value = process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length)
  if (value === undefined) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${prefix}<number> is required`)
  return parsed
}

function readStringOption(name, fallback) {
  const prefix = `--${name}=`
  return process.argv.find(argument => argument.startsWith(prefix))?.slice(prefix.length) ?? fallback
}

async function findJsonFiles(path) {
  const entries = await readdir(path, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(entry => {
      const entryPath = resolve(path, entry.name)
      if (entry.isDirectory()) return findJsonFiles(entryPath)
      return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : []
    })
  )
  return nested.flat()
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const metricsDirectory = resolve(readStringOption('metrics-dir', 'artifacts/ci-metrics'))
const phase = readStringOption('phase', 'validation')
const baselineMedianMs = readNumberOption('baseline-median-ms')
const minimumSamples = readNumberOption('minimum-samples', 10)
const minimumCacheHitRate = readNumberOption('minimum-cache-hit-rate', 0.7)
const requiredImprovement = readNumberOption('required-improvement', 0.4)
const outputPath = resolve(readStringOption('output', 'artifacts/ci-metrics/evaluation.json'))

if (!baselineMedianMs || baselineMedianMs <= 0) {
  throw new Error('--baseline-median-ms must be a positive Wave 0 baseline')
}
if (minimumSamples < 2) throw new Error('--minimum-samples must be at least 2')

const files = await findJsonFiles(metricsDirectory)
const reports = (
  await Promise.all(
    files.map(async file => {
      try {
        return JSON.parse(await readFile(file, 'utf8'))
      } catch {
        return null
      }
    })
  )
).filter(
  report =>
    report?.schemaVersion === 1 && report.phase === phase && report.exitCode === 0 && Number.isFinite(report.durationMs)
)

const deterministicTasks = reports.flatMap(report =>
  report.tasks.filter(task => ['lint', 'typecheck', 'test', 'build'].includes(task.target))
)
const cacheHits = deterministicTasks.filter(task => task.cacheStatus?.endsWith('cache-hit'))
const remoteCacheHits = deterministicTasks.filter(task => task.cacheStatus === 'remote-cache-hit')
const medianDurationMs = reports.length > 0 ? median(reports.map(report => report.durationMs)) : null
const improvement = medianDurationMs === null ? null : (baselineMedianMs - medianDurationMs) / baselineMedianMs
const cacheHitRate = deterministicTasks.length === 0 ? null : cacheHits.length / deterministicTasks.length

const bySha = new Map()
for (const report of reports) {
  const sha = report.github?.sha
  if (!sha) continue
  const values = bySha.get(sha) ?? []
  values.push(report)
  bySha.set(sha, values)
}
const repeatedShaProofs = [...bySha.entries()].flatMap(([sha, values]) => {
  const sorted = values.sort((left, right) => left.startedAt.localeCompare(right.startedAt))
  if (sorted.length < 2) return []
  const repeated = sorted.slice(1).find(report => {
    const tasks = report.tasks.filter(task => ['lint', 'typecheck', 'test', 'build'].includes(task.target))
    return tasks.length > 0 && tasks.every(task => task.cacheStatus === 'remote-cache-hit')
  })
  return repeated ? [{ sha, runId: repeated.github?.runId ?? null }] : []
})

const checks = {
  enoughSamples: reports.length >= minimumSamples,
  medianImprovement: improvement !== null && improvement >= requiredImprovement,
  cacheHitRate: cacheHitRate !== null && cacheHitRate >= minimumCacheHitRate,
  repeatedShaRemoteCache: repeatedShaProofs.length > 0
}
const evaluation = {
  schemaVersion: 1,
  evaluatedAt: new Date().toISOString(),
  phase,
  thresholds: {
    baselineMedianMs,
    minimumSamples,
    minimumCacheHitRate,
    requiredImprovement
  },
  observed: {
    samples: reports.length,
    medianDurationMs,
    improvement,
    deterministicTasks: deterministicTasks.length,
    cacheHits: cacheHits.length,
    remoteCacheHits: remoteCacheHits.length,
    cacheHitRate,
    repeatedShaProofs
  },
  checks,
  passed: Object.values(checks).every(Boolean)
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(evaluation, null, 2))
if (!evaluation.passed) process.exitCode = 1
