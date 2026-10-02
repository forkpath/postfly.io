import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { CreateBucketCommand, DeleteObjectsCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'

import { publishRelease, s3Store } from './publish.mjs'
import { reportDirectory } from './test-utils.mjs'

if (!process.env.DESKTOP_S3_ENDPOINT || !process.env.DESKTOP_S3_BUCKET)
  throw new Error(
    'Start MinIO and configure DESKTOP_S3_ENDPOINT, DESKTOP_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY'
  )
const env = { ...process.env, DESKTOP_S3_PATH_STYLE: 'true' }
const client = new S3Client({
  endpoint: env.DESKTOP_S3_ENDPOINT,
  region: env.DESKTOP_S3_REGION || 'us-east-1',
  forcePathStyle: true
})
const store = s3Store(env)
const prefix = `integration/${randomUUID()}`
const artifactKey = `${prefix}/Ray-0.1.1.exe`
const manifestKey = `${prefix}/latest.yml`
const interruptedArtifact = `${prefix}/interrupted.exe`
const interruptedManifest = `${prefix}/interrupted.yml`
try {
  try {
    await client.send(new CreateBucketCommand({ Bucket: env.DESKTOP_S3_BUCKET }))
  } catch (error) {
    if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(error.name)) throw error
  }
  const release = {
    artifacts: [{ key: artifactKey, body: Buffer.from('integration-artifact') }],
    manifests: [{ key: manifestKey, body: Buffer.from('version: 0.1.1') }]
  }
  const writes = []
  await publishRelease(release, {
    get: store.get,
    put: async (key, body, cache) => {
      if (key === manifestKey) assert((await store.get(artifactKey)).equals(release.artifacts[0].body))
      else assert.equal(await store.get(manifestKey), null)
      writes.push(key)
      await store.put(key, body, cache)
    }
  })
  assert.deepEqual(writes, [artifactKey, manifestKey])
  await assert.rejects(
    publishRelease(
      {
        artifacts: [{ key: interruptedArtifact, body: Buffer.from('partial-release') }],
        manifests: [{ key: interruptedManifest, body: Buffer.from('must-not-publish') }]
      },
      { get: async () => null, put: store.put }
    ),
    /verification/
  )
  assert.equal(await store.get(interruptedManifest), null)

  assert((await store.get(artifactKey)).equals(release.artifacts[0].body))
  assert((await store.get(manifestKey)).equals(release.manifests[0].body))
  const artifact = await client.send(new HeadObjectCommand({ Bucket: env.DESKTOP_S3_BUCKET, Key: artifactKey }))
  const manifest = await client.send(new HeadObjectCommand({ Bucket: env.DESKTOP_S3_BUCKET, Key: manifestKey }))
  assert(artifact.CacheControl.includes('immutable'))
  assert(manifest.CacheControl.includes('no-store'))
  await assert.rejects(
    publishRelease({ ...release, artifacts: [{ key: artifactKey, body: Buffer.from('changed') }] }, store),
    /immutable/
  )
  await writeFile(
    path.join(await reportDirectory('publish'), 'result.json'),
    JSON.stringify({
      passed: true,
      checks: ['readback', 'cache-headers', 'immutable', 'artifact-before-manifest', 'interrupted-release']
    })
  )
  console.log('Real S3 upload, readback, immutability and cache-header tests passed')
} finally {
  await client.send(
    new DeleteObjectsCommand({
      Bucket: env.DESKTOP_S3_BUCKET,
      Delete: { Objects: [artifactKey, manifestKey, interruptedArtifact, interruptedManifest].map(Key => ({ Key })) }
    })
  )
  store.close()
  client.destroy()
}
