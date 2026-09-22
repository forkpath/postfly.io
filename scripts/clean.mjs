#!/usr/bin/env node

/**
 * 清理仓库及子项目中的依赖、构建产物和缓存。
 * 用法: node scripts/clean.mjs [--dry-run]
 * 保留 Git 已跟踪的文件、发布配置、依赖补丁和符号链接。
 * 不清理环境配置、签名材料或用户报告；不跟随符号链接访问仓库外部。
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, rmSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

// 与 .gitignore 中的构建、测试及缓存目录规则保持一致。
const TARGET_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'tmp',
  'out',
  'out-tsc',
  'coverage',
  '.nyc_output',
  'test-results',
  'playwright-report',
  'blob-report',
  '.playwright-mcp',
  '.vite',
  '.vite-temp',
  '.cache',
  '.sass-cache',
  '.tanstack',
  '.nitro',
  '.output',
  '.source',
  '.expo',
  '.wxt',
  'Pods',
  '.gradle',
  '.metro',
  '.log',
  'logs'
])

// 限定路径，避免误删其他位置同名的源码/配置目录。
const EXPLICIT_REL_PATHS = new Set([
  'ios',
  'android',
  'apps/mobile/ios',
  'apps/mobile/android',
  '.nx/cache',
  '.nx/workspace-data',
  '.nx/migrate-runs',
  '.nx/polygraph',
  '.nx/self-healing',
  '.vscode/.react',
  'artifacts/ci-metrics',
  'artifacts/ci-metrics-evaluation',
  'artifacts/ci-baseline',
  'artifacts/ci-baseline-samples',
  'artifacts/ci-baseline-summary'
])

const SKIP_DIRS = new Set(['.git', 'patches'])
const isDryRun = process.argv.includes('--dry-run')
let removedCount = 0

// Git 不可用时中止，不能在无法判断源码范围时执行删除。
const trackedPaths = new Set()
try {
  const files = execFileSync('git', ['ls-files', '-z', '--cached'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024
  })
  for (const file of files.split('\0').filter(Boolean)) {
    const parts = file.split('/')
    while (parts.length) {
      trackedPaths.add(parts.join('/'))
      parts.pop()
    }
  }
} catch (error) {
  console.error(`无法读取 Git 跟踪文件，已停止清理: ${error.message}`)
  process.exit(1)
}

function isGeneratedFile(name) {
  return (
    name.endsWith('.tsbuildinfo') ||
    name === '.eslintcache' ||
    name === '.stylelintcache' ||
    name === 'expo-env.d.ts' ||
    name === 'routeTree.gen.ts' ||
    name === 'i18nTree.gen.ts' ||
    /^(vite|vitest)\.config\..*\.timestamp.*$/.test(name)
  )
}

function cleanDirectory(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    // 包括指向外部目录、循环链接及失效链接：均不跟随、不删除。
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue

    const fullPath = join(dir, entry.name)
    const rel = relative(ROOT_DIR, fullPath).split(sep).join('/')
    const matches = entry.isDirectory()
      ? TARGET_DIRS.has(entry.name) || EXPLICIT_REL_PATHS.has(rel)
      : entry.isFile() && isGeneratedFile(entry.name)

    try {
      if (matches && !trackedPaths.has(rel)) {
        console.log(`${isDryRun ? '[预览] 将删除' : '正在删除'}: ${rel}`)
        if (!isDryRun) rmSync(fullPath, { recursive: true, force: true })
        removedCount++
        continue
      }
      if (matches) console.log(`[保留] Git 已跟踪的文件或目录: ${rel}`)
      // 保护含有已跟踪文件的目录，但仍可清理其中未跟踪的缓存。
      if (entry.isDirectory()) cleanDirectory(fullPath)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.warn(`无法处理 ${rel}: ${error.message}`)
        process.exitCode = 1
      }
    }
  }
}

console.log(isDryRun ? '🔍 预览模式\n' : '🧹 正在清理 monorepo...\n')
cleanDirectory(ROOT_DIR)
console.log(`\n${isDryRun ? '将删除' : '已删除'} ${removedCount} 个项目`)
if (isDryRun) console.log('\n移除 --dry-run 参数以实际执行删除操作。')
