import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { transform } from '@swc/core'

const workspace = resolve(import.meta.dirname, '../..')

export function backendConfig(project, suite) {
  const root = resolve(workspace, `services/${project}`)
  const base = JSON.parse(readFileSync(resolve(workspace, 'tsconfig.base.json'), 'utf8'))
  const app = JSON.parse(readFileSync(resolve(root, 'tsconfig.app.json'), 'utf8'))
  const paths = { ...base.compilerOptions.paths, ...app.compilerOptions.paths }
  return {
    root,
    envDir: false,
    // SWC owns TypeScript, JSX and Nest decorator metadata below. Transforming
    // its JavaScript again can move derived-class fields ahead of super().
    oxc: false,
    resolve: {
      alias: Object.entries(paths).map(([key, values]) => ({
        find: new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '(.*)')}$`),
        replacement: resolve(workspace, values[0].replace('*', '$1'))
      }))
    },
    plugins: [
      {
        name: 'ray-nest-test-decorators',
        enforce: 'pre',
        async transform(source, id) {
          if (!/\.[cm]?tsx?$/.test(id) || id.includes('/node_modules/')) return
          return transform(source, {
            filename: id,
            sourceMaps: 'inline',
            jsc: {
              target: 'es2022',
              parser: { syntax: 'typescript', tsx: id.endsWith('.tsx'), decorators: true },
              transform: { legacyDecorator: true, decoratorMetadata: true, react: { runtime: 'automatic' } }
            },
            module: { type: 'es6' }
          })
        }
      }
    ],
    test: {
      name: `${project}-${suite}`,
      watch: false,
      environment: 'node',
      include: [`tests/**/*.${suite}.spec.ts`],
      setupFiles: [resolve(workspace, 'scripts/testing/backend-setup.ts')],
      fileParallelism: false,
      maxWorkers: 1,
      testTimeout: 30_000,
      hookTimeout: 60_000,
      reporters: ['default', 'junit'],
      outputFile: {
        junit: resolve(
          process.env.RAY_TEST_REPORT_DIR ?? resolve(workspace, `dist/test-results/${project}/${suite}`),
          'junit.xml'
        )
      }
    }
  }
}
