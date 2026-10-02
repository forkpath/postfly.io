import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { expect, it } from 'vitest'

import { collectRelease } from '../scripts/publish.mjs'

const require = createRequire(import.meta.url)
const version = require('../package.json').version
const { stringify } = require('yaml')
const env = {
  DESKTOP_UPDATE_BASE_URL: 'https://cdn.example.com/ray',
  DESKTOP_S3_BUCKET: 'test',
  DESKTOP_S3_PREFIX: 'ray',
  GITHUB_REF: `refs/tags/desktop-v${version}`
}
it('requires all target receipts, package version and actual artifact checksums before upload', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ray-release-test-'))
  try {
    for (const [platform, arch] of [
      ['darwin', 'arm64'],
      ['darwin', 'x64'],
      ['win32', 'x64']
    ]) {
      const directory = path.join(root, platform, arch)
      await mkdir(directory, { recursive: true })
      await writeFile(
        path.join(directory, 'release.json'),
        JSON.stringify({
          version,
          platform,
          arch,
          profile: 'release',
          ref: env.GITHUB_REF,
          updateUrl: `${env.DESKTOP_UPDATE_BASE_URL}/stable/${platform}/${arch}/`
        })
      )
      const files = []
      for (const ext of platform === 'darwin' ? ['dmg', 'zip'] : ['exe']) {
        const url = `Ray-${version}-${platform}-${arch}.${ext}`
        const bytes = Buffer.from(url)
        await writeFile(path.join(directory, url), bytes)
        files.push({ url, size: bytes.length, sha512: createHash('sha512').update(bytes).digest('base64') })
      }
      await writeFile(
        path.join(directory, platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml'),
        stringify({ version, files })
      )
    }
    const release = await collectRelease(root, env)
    expect(release.artifacts).toHaveLength(5)
    expect(release.manifests).toHaveLength(3)
    expect(release.manifests[0].key).toBe('ray/stable/darwin/arm64/latest-mac.yml')
    await expect(collectRelease(root, { ...env, GITHUB_REF: 'refs/tags/desktop-v999.0.0' })).rejects.toThrow('metadata')
    const installer = path.join(root, 'win32/x64', `Ray-${version}-win32-x64.exe`)
    const original = await readFile(installer)
    await writeFile(installer, 'corrupt')
    await expect(collectRelease(root, env)).rejects.toThrow('Checksum')
    await writeFile(installer, original)
    await rm(path.join(root, 'darwin/arm64/release.json'))
    await expect(collectRelease(root, env)).rejects.toThrow()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
