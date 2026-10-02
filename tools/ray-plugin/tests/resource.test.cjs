const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { resolve } = require('node:path')
const { test } = require('node:test')
const { createTreeWithEmptyWorkspace } = require('@nx/devkit/testing')
const ts = require('typescript')
const generate = require('../src/generators/resource/generator.cjs')

const root = resolve(__dirname, '../../..')
function fixture() {
  const tree = createTreeWithEmptyWorkspace()
  tree.delete('.oxfmtrc.json')
  tree.write('.prettierrc', '{"printWidth":120,"singleQuote":true,"semi":false}')
  for (const path of ['libs/pg-dao/src/schema.prisma', 'libs/pg-dao/src/models/auth.prisma']) {
    tree.write(path, readFileSync(resolve(root, path)))
  }
  tree.write('services/engine/src/app.module.ts', '@Module({ imports: [ExistingModule] }) export class AppModule {}')
  for (const path of [
    'libs/payload/src/index.ts',
    'libs/api-client/src/index.ts',
    'libs/api-client/src/domains/index.ts'
  ])
    tree.write(path, 'export {}\n')
  tree.write('libs/pg-dao/src/migrations/20260101235959_baseline/migration.sql', '-- fixture')
  return tree
}
const options = { name: 'reading-note', plural: 'reading-notes', ownership: 'user' }
const snapshot = tree =>
  tree
    .listChanges()
    .map(change => [change.path, change.content?.toString()])
    .sort()

for (const ownership of ['user', 'organization'])
  test(`generates deterministic complete ${ownership} resources`, async () => {
    const first = fixture()
    const second = fixture()
    const auth = first.read('libs/pg-dao/src/models/auth.prisma', 'utf8')
    await generate(first, { ...options, ownership })
    await generate(second, { ...options, ownership })
    assert.deepEqual(snapshot(first), snapshot(second))
    assert.equal(first.read('libs/pg-dao/src/models/auth.prisma', 'utf8'), auth)
    assert.ok(first.exists('libs/pg-dao/src/migrations/20260102000000_add_reading_note/migration.sql'))
    assert.match(first.read('services/engine/src/app.module.ts', 'utf8'), /imports:\s*\[\s*ReadingNoteModule,/)
    const changes = first.listChanges().filter(change => change.path.includes('reading-note'))
    assert.ok(changes.length >= 20)
    for (const change of changes)
      if (change.path.endsWith('.ts')) {
        const source = ts.createSourceFile(change.path, change.content.toString(), ts.ScriptTarget.Latest, true)
        assert.deepEqual(source.parseDiagnostics, [], change.path)
        assert.doesNotMatch(change.content.toString(), /\bany\b|TODO|\.skip\(/, change.path)
      }
    assert.match(first.read('libs/api-client/src/index.ts', 'utf8'), /readingNoteQueries/)
  })

test('invalid input and repeated generation fail without partial writes', async () => {
  for (const invalid of [
    { name: '../escape' },
    { plural: 'bad/route' },
    { ownership: 'workspace' },
    { name: 'user' },
    { name: 'a'.repeat(33) },
    { plural: 'reading-note' }
  ]) {
    const tree = fixture()
    const before = snapshot(tree)
    await assert.rejects(generate(tree, { ...options, ...invalid }))
    assert.deepEqual(snapshot(tree), before)
  }
  const tree = fixture()
  await generate(tree, options)
  const before = snapshot(tree)
  await assert.rejects(generate(tree, options), /already exists|overwrite/)
  assert.deepEqual(snapshot(tree), before)
})

test('guards existing models, files and incompatible composition roots before writing', async () => {
  for (const [path, content] of [
    ['libs/pg-dao/src/models/custom.prisma', 'model ReadingNote { id String @id }'],
    ['libs/payload/src/schemas/reading-note.ts', 'export const existing = true'],
    ['services/engine/src/app.module.ts', 'export class AppModule {}']
  ]) {
    const tree = fixture()
    tree.write(path, content)
    const before = snapshot(tree)
    await assert.rejects(generate(tree, options))
    assert.deepEqual(snapshot(tree), before)
  }
})
