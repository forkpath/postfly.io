import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const require = createRequire(import.meta.url)
const { updateUrl } = require('./config.cjs')
const targets = [
  ['darwin', 'arm64'],
  ['darwin', 'x64'],
  ['win32', 'x64']
]

export async function collectRelease(root, env) {
  if (!env.DESKTOP_UPDATE_BASE_URL || !env.DESKTOP_S3_BUCKET)
    throw new Error('Update base URL and S3 bucket are required')
  const prefix = (env.DESKTOP_S3_PREFIX || '').replace(/^\/+|\/+$/g, '')
  if (prefix.split('/').includes('..')) throw new Error('Invalid S3 prefix')
  const artifacts = []
  const manifests = []
  const version = require('../package.json').version
  for (const [platform, arch] of targets) {
    const directory = path.join(root, platform, arch)
    const metadata = JSON.parse(await readFile(path.join(directory, 'release.json'), 'utf8'))
    if (
      metadata.profile !== 'release' ||
      metadata.version !== version ||
      metadata.platform !== platform ||
      metadata.arch !== arch ||
      metadata.ref !== `refs/tags/desktop-v${version}` ||
      env.GITHUB_REF !== metadata.ref ||
      metadata.updateUrl !== updateUrl(env.DESKTOP_UPDATE_BASE_URL, platform, arch)
    )
      throw new Error(`Invalid release metadata for ${platform}/${arch}`)
    const names = await readdir(directory)
    const extensions = platform === 'darwin' ? ['.dmg', '.zip'] : ['.exe']
    for (const extension of extensions)
      if (!names.some(name => name.endsWith(extension))) throw new Error(`Missing ${extension} for ${platform}/${arch}`)
    const manifestName = platform === 'darwin' ? 'latest-mac.yml' : 'latest.yml'
    if (!names.includes(manifestName)) throw new Error(`Missing ${manifestName}`)
    const manifestBody = await readFile(path.join(directory, manifestName))
    const yaml = require('yaml')
    const manifest = yaml.parse(manifestBody.toString())
    if (manifest.version !== version || !Array.isArray(manifest.files) || !manifest.files.length)
      throw new Error('Invalid update manifest')
    for (const file of manifest.files) {
      if (path.basename(file.url) !== file.url || !names.includes(file.url))
        throw new Error('Manifest references an absent/local-unsafe artifact')
      const bytes = await readFile(path.join(directory, file.url))
      if (createHash('sha512').update(bytes).digest('base64') !== file.sha512 || bytes.length !== file.size)
        throw new Error(`Checksum mismatch: ${file.url}`)
    }
    for (const name of names.filter(name => /\.(exe|dmg|zip|blockmap)$/.test(name))) {
      if (!name.includes(`-${version}-`)) throw new Error('Artifact filename must include version')
      artifacts.push({
        key: [prefix, 'stable', platform, arch, name].filter(Boolean).join('/'),
        body: await readFile(path.join(directory, name)),
        manifest: false
      })
    }
    manifests.push({
      key: [prefix, 'stable', platform, arch, manifestName].filter(Boolean).join('/'),
      body: manifestBody,
      manifest: true
    })
  }
  return { artifacts, manifests }
}

export async function publishRelease(release, store) {
  // Validate every target before uploading; verify all immutable bytes before promoting any feed.
  for (const file of release.artifacts) {
    const existing = await store.get(file.key)
    if (existing && !existing.equals(file.body))
      throw new Error(`Refusing to overwrite immutable artifact: ${file.key}`)
    if (!existing) await store.put(file.key, file.body, 'public, max-age=31536000, immutable')
    const actual = await store.get(file.key)
    if (!actual?.equals(file.body)) throw new Error(`Remote verification failed: ${file.key}`)
  }
  for (const file of release.manifests) {
    await store.put(file.key, file.body, 'no-cache, no-store, must-revalidate')
  }
}

export function s3Store(env) {
  const client = new S3Client({
    endpoint: env.DESKTOP_S3_ENDPOINT || undefined,
    region: env.DESKTOP_S3_REGION || 'us-east-1',
    forcePathStyle: env.DESKTOP_S3_PATH_STYLE === 'true'
  })
  return {
    async get(Key) {
      try {
        const response = await client.send(new GetObjectCommand({ Bucket: env.DESKTOP_S3_BUCKET, Key }))
        return Buffer.from(await response.Body.transformToByteArray())
      } catch (error) {
        if (error.$metadata?.httpStatusCode === 404) return null
        throw error
      }
    },
    async put(Key, Body, CacheControl) {
      await client.send(
        new PutObjectCommand({
          Bucket: env.DESKTOP_S3_BUCKET,
          Key,
          Body,
          CacheControl,
          ContentType: Key.endsWith('.yml') ? 'application/yaml' : 'application/octet-stream'
        })
      )
    },
    close() {
      client.destroy()
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const release = await collectRelease(path.resolve('../../dist/desktop/release'), process.env)
  const store = s3Store(process.env)
  try {
    await publishRelease(release, store)
  } finally {
    store.close()
  }
}
