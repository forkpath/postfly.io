import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'

import { build } from 'esbuild'
import { ESLint } from 'eslint'
import ts from 'typescript'

const root = resolve(import.meta.dirname, '../..')
const output = execFileSync('pnpm', ['nx', 'graph', '--print'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024
})
const graph = JSON.parse(output.slice(output.indexOf('{'))).graph

function reachable(name, seen = new Set()) {
  if (seen.has(name)) return seen
  seen.add(name)
  for (const edge of graph.dependencies[name] ?? []) reachable(edge.target, seen)
  return seen
}

test('runtime projects have truthful tags and frontend consumers cannot reach Node projects', () => {
  for (const family of ['analytics', 'monitoring']) {
    for (const [suffix, runtime] of [
      ['', 'universal'],
      ['-web', 'web'],
      ['-native', 'native'],
      ['-server', 'node']
    ]) {
      assert.ok(graph.nodes[family + suffix].data.tags.includes('runtime:' + runtime))
    }
  }
  assert.ok(graph.nodes['email'].data.tags.includes('runtime:universal'))
  assert.ok(graph.nodes['email-server'].data.tags.includes('runtime:node'))
  for (const app of ['web', 'desktop', 'mobile', 'extension']) {
    for (const name of reachable(app)) {
      assert.ok(!graph.nodes[name]?.data.tags?.includes('runtime:node'), `${app} reaches Node project ${name}`)
    }
  }
  // Changes in server implementations must not affect clients through a core facade.
  for (const name of ['analytics', 'monitoring', 'email']) {
    assert.deepEqual([...reachable(name)], [name])
  }
})

test('ESLint rejects canonical and compatibility Node entries from Web/Native consumers', async () => {
  const eslint = new ESLint({ cwd: root })
  for (const app of ['web', 'mobile']) {
    for (const specifier of [
      '@libs/analytics-server',
      '@libs/analytics/server',
      '@libs/monitoring/server',
      '@libs/email/server'
    ]) {
      const results = await eslint.lintText(`import * as forbidden from '${specifier}'\nconsole.log(forbidden)\n`, {
        filePath: resolve(root, `apps/${app}/src/runtime-boundary-probe.ts`)
      })
      assert.ok(
        results.some(r => r.messages.some(m => m.ruleId === '@nx/enforce-module-boundaries')),
        `${app}: ${specifier} was not rejected`
      )
    }
  }
})

test('universal entry bundles contain no provider SDK, environment evaluation or Node imports', async () => {
  for (const family of ['email', 'analytics', 'monitoring']) {
    const result = await build({
      absWorkingDir: root,
      entryPoints: [`libs/${family}/src/index.ts`],
      bundle: true,
      platform: 'browser',
      format: 'esm',
      write: false,
      metafile: true,
      tsconfig: 'tsconfig.base.json',
      logLevel: 'silent'
    })
    const inputs = Object.keys(result.metafile.inputs)
    assert.ok(!inputs.some(file => /posthog|sentry|resend|envin|aws-sdk|alicloud/.test(file)), inputs.join('\n'))
    assert.ok(!result.outputFiles[0].text.includes('GOOGLE_ANALYTICS_SECRET'))
  }
})

test('ESLint prevents a universal core from reintroducing SDK or env imports', async () => {
  const eslint = new ESLint({ cwd: root })
  for (const family of ['email', 'analytics', 'monitoring']) {
    for (const specifier of ['envin', 'node:crypto', 'posthog-node']) {
      const results = await eslint.lintText(`import * as forbidden from '${specifier}'\nconsole.log(forbidden)\n`, {
        filePath: resolve(root, `libs/${family}/src/runtime-boundary-probe.ts`)
      })
      assert.ok(
        results.some(r => r.messages.some(m => m.ruleId === 'no-restricted-imports')),
        `${family}: ${specifier}`
      )
    }
  }
})

test('native env accesses use the static Expo syntax, not dynamic keys or import.meta', () => {
  for (const family of ['analytics', 'monitoring']) {
    const file = `libs/${family}-native/src/env.ts`
    const text = readFileSync(resolve(root, file), 'utf8')
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
    let count = 0
    function visit(node) {
      if (ts.isElementAccessExpression(node)) assert.notEqual(node.expression.getText(source), 'process.env')
      if (ts.isPropertyAccessExpression(node) && node.expression.getText(source) === 'process.env') {
        assert.ok(node.name.text.startsWith('EXPO_PUBLIC_'))
        count++
      }
      assert.ok(!ts.isMetaProperty(node), 'Native env must not use import.meta')
      ts.forEachChild(node, visit)
    }
    visit(source)
    assert.ok(count >= 3)
  }
})
