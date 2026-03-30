#!/usr/bin/env node

/**
 * Monorepo 清理脚本
 *
 * 递归删除根目录及所有子项目（apps/、libs/、services/）中的
 * 构建产物、缓存和依赖目录。
 *
 * 用法: node scripts/clean.js [--dry-run]
 */
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT_DIR = join(__dirname, '..')

// 需要清理的目录
const TARGET_DIRS = [
  'node_modules',
  'dist',
  '.nx',
  '.vite',
  '.cache',
  '.tanstack',
  '.log',
  '.playwright-mcp',
  '.output'
]

// 跳过的目录（性能优化）
const SKIP_DIRS = ['node_modules', '.git']

const isDryRun = process.argv.includes('--dry-run')
let removedCount = 0

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

      if (TARGET_DIRS.includes(entry)) {
        const relativePath = relative(ROOT_DIR, fullPath)
        if (isDryRun) {
          console.log(`[预览] 将删除: ${relativePath}`)
        } else {
          console.log(`正在删除: ${relativePath}`)
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

cleanDirectory(ROOT_DIR)

console.log(`\n✅ ${isDryRun ? '将删除' : '已删除'} ${removedCount} 个目录`)

if (isDryRun) {
  console.log('\n移除 --dry-run 参数以实际执行删除操作。')
}
