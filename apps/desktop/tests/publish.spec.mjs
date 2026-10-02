import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { publishRelease } from '../scripts/publish.mjs'

const require = createRequire(import.meta.url)
const { updateUrl, validateRelease, createConfig } = require('../scripts/config.cjs')

describe('release boundaries', () => {
  it('requires HTTPS and keeps test-only HTTP restricted to loopback', () => {
    expect(updateUrl('https://cdn.example.com/apps/', 'darwin', 'arm64')).toBe(
      'https://cdn.example.com/apps/stable/darwin/arm64/'
    )
    expect(() => updateUrl('http://example.com', 'darwin', 'arm64', true)).toThrow()
    expect(() => updateUrl('http://localhost:9000', 'darwin', 'arm64')).toThrow()
    expect(updateUrl('http://localhost:9000', 'darwin', 'arm64', true)).toContain('/stable/darwin/arm64/')
    expect(() => updateUrl('https://name:secret@example.com', 'darwin', 'arm64')).toThrow()
  })
  it('fails a release without matching version and signing credentials', () => {
    expect(() => validateRelease({}, 'darwin', '1.0.0')).toThrow('tag')
    expect(() =>
      validateRelease(
        {
          GITHUB_REF: 'refs/tags/desktop-v1.0.0',
          DESKTOP_UPDATE_BASE_URL: 'https://cdn.example.com',
          VITE_API_ENDPOINT: 'https://api.example.com'
        },
        'darwin',
        '1.0.0'
      )
    ).toThrow('CSC_LINK')
    expect(() => validateRelease({}, 'darwin', '1.0.0-beta.1')).toThrow('stable')
  })
  it('writes updater configuration for directory-only packages before signing', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ray-dir-config-'))
    try {
      const config = createConfig({ DESKTOP_UPDATE_BASE_URL: 'https://cdn.example.com' }, 'darwin', 'x64')
      await config.afterPack({
        appOutDir: directory,
        targets: [{ name: 'dir' }],
        packager: { getResourcesDir: () => directory, appInfo: { updaterCacheDirName: 'ray-updater' } }
      })
      const yaml = require('yaml')
      expect(yaml.parse(await readFile(path.join(directory, 'app-update.yml'), 'utf8'))).toEqual({
        provider: 'generic',
        channel: 'latest',
        url: 'https://cdn.example.com/stable/darwin/x64/',
        updaterCacheDirName: 'ray-updater'
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
  it('retains production fuses and isolates test outputs', () => {
    const local = createConfig({}, 'darwin', 'arm64')
    const test = createConfig({ DESKTOP_PROFILE: 'test' }, 'darwin', 'arm64')
    expect(local.electronFuses.enableNodeCliInspectArguments).toBe(false)
    expect(test.electronFuses.enableNodeCliInspectArguments).toBe(true)
    expect(test.directories.output).not.toBe(local.directories.output)
    expect(local.electronFuses.runAsNode).toBe(false)
  })
  it('uploads and verifies all artifacts before any manifest; refuses changed immutable bytes', async () => {
    const calls = []
    const objects = new Map()
    const store = {
      get: async key => objects.get(key),
      put: async (key, body) => {
        calls.push(key)
        objects.set(key, body)
      }
    }
    const release = {
      artifacts: [
        { key: 'a.exe', body: Buffer.from('a') },
        { key: 'b.zip', body: Buffer.from('b') }
      ],
      manifests: [{ key: 'latest.yml', body: Buffer.from('manifest') }]
    }
    await publishRelease(release, store)
    expect(calls).toEqual(['a.exe', 'b.zip', 'latest.yml'])
    objects.set('a.exe', Buffer.from('different'))
    await expect(publishRelease(release, store)).rejects.toThrow('immutable')
  })
  it('never publishes metadata if artifact verification fails', async () => {
    const writes = []
    await expect(
      publishRelease(
        {
          artifacts: [{ key: 'a.exe', body: Buffer.from('a') }],
          manifests: [{ key: 'latest.yml', body: Buffer.from('metadata') }]
        },
        {
          get: async () => null,
          put: async key => {
            writes.push(key)
          }
        }
      )
    ).rejects.toThrow('verification')
    expect(writes).toEqual(['a.exe'])
  })
})
