#!/usr/bin/env node

/**
 * Monorepo 清理脚本
 *
 * 递归删除根目录及所有子项目（apps/、libs/、services/）中的
 * 构建产物、缓存和依赖目录。
 *
 * 并对 mobile（Expo / RN）与 extension（WXT）补充：
 * - 原生工程目录（ios / android，由 prebuild 生成）
 * - CocoaPods、Gradle、Metro、Xcode/Android build 等常见产物目录名
 *
 * 用法: node scripts/clean.mjs [--dry-run]
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// 递归扫描时按「目录 basename」匹配并删除
const TARGET_DIRS = [
  'node_modules',
  'dist',
  '.nx',
  '.vite',
  '.cache',
  '.tanstack',
  '.log',
  '.playwright-mcp',
  '.output',
  '.expo',
  '.wxt',
  // mobile / native
  'Pods',
  '.gradle',
  'build',
  '.metro'
]

// 整段路径删除（相对仓库根目录），用于 prebuild 生成的原生工程
const EXPLICIT_REL_PATHS = ['apps/mobile/ios', 'apps/mobile/android']

// 跳过的目录（性能优化）
const SKIP_DIRS = ['node_modules', '.git']

/** 是否位于「整段删除」路径之下（避免与递归规则重复匹配 / dry-run 重复输出） */
function isUnderExplicitRemove(fullPath) {
  const rel = relative(ROOT_DIR, fullPath)
  if (rel.startsWith('..')) return false
  return EXPLICIT_REL_PATHS.some(p => rel === p || rel.startsWith(`${p}/`))
}

const isDryRun = process.argv.includes('--dry-run')
let removedCount = 0

function logRemoveMatched(relativePath) {
  if (isDryRun) {
    console.log(`[预览] 将删除: ${relativePath}`)
  } else {
    console.log(`正在删除: ${relativePath}`)
  }
}

/**
 * 删除预置路径（mobile 的 ios/android 整体）
 */
function cleanExplicitPaths() {
  for (const rel of EXPLICIT_REL_PATHS) {
    const fullPath = join(ROOT_DIR, rel)
    if (!existsSync(fullPath)) continue

    if (isDryRun) {
      console.log(`[预览] 将删除（原生工程）: ${rel}`)
    } else {
      console.log(`正在删除（原生工程）: ${rel}`)
    }
    if (!isDryRun) {
      rmSync(fullPath, { recursive: true, force: true })
    }
    removedCount++
  }
}

/**
 * 递归查找并删除目标目录
 */
function cleanDirectory(dir, depth = 0) {
  if (!existsSync(dir)) return

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)

    try {
      const stat = statSync(fullPath)
      if (!stat.isDirectory()) continue

      if (isUnderExplicitRemove(fullPath)) {
        continue
      }

      if (TARGET_DIRS.includes(entry)) {
        const relativePath = relative(ROOT_DIR, fullPath)
        logRemoveMatched(relativePath)
        if (!isDryRun) {
          rmSync(fullPath, { recursive: true, force: true })
        }
        removedCount++
        // 已删除的目录不再递归
        continue
      }

      // 跳过某些目录以提升性能
      if (SKIP_DIRS.includes(entry)) continue

      // 递归处理子目录
      cleanDirectory(fullPath, depth + 1)
    } catch (err) {
      // 忽略权限错误等
      if (err.code !== 'ENOENT') {
        console.warn(`警告: 无法处理 ${fullPath}: ${err.message}`)
      }
    }
  }
}

// 主程序
console.log(isDryRun ? '🔍 预览模式\n' : '🧹 正在清理 monorepo...\n')

cleanExplicitPaths()
cleanDirectory(ROOT_DIR)

console.log(`\n✅ ${isDryRun ? '将删除' : '已删除'} ${removedCount} 个项目`)

if (isDryRun) {
  console.log('\n移除 --dry-run 参数以实际执行删除操作。')
}
