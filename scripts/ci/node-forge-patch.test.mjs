import assert from 'node:assert/strict'
import { constants, createHash, generateKeyPairSync, privateEncrypt, verify } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { test } from 'node:test'

const require = createRequire(import.meta.url)
const expoRequire = createRequire(require.resolve('expo/package.json'))
const cliManifest = expoRequire.resolve('@expo/cli/package.json')
const cliRequire = createRequire(cliManifest)
const forge = cliRequire('node-forge')
const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 65537,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
})
const publicKey = forge.pki.publicKeyFromPem(keys.publicKey)
const privateKey = forge.pki.privateKeyFromPem(keys.privateKey)
const message = 'Ray synthetic signature regression fixture'
const digest = createHash('sha256').update(message).digest('latin1')
const { asn1 } = forge
const element = (type, value, constructed = false) => asn1.create(asn1.Class.UNIVERSAL, type, constructed, value)

function signature({ parameters = true, extra = [] } = {}) {
  const algorithm = [element(asn1.Type.OID, asn1.oidToDer(forge.pki.oids.sha256).getBytes())]
  if (parameters) algorithm.push(element(asn1.Type.NULL, ''))
  algorithm.push(...extra)
  const info = element(
    asn1.Type.SEQUENCE,
    [element(asn1.Type.SEQUENCE, algorithm, true), element(asn1.Type.OCTETSTRING, digest)],
    true
  )
  return privateEncrypt(
    { key: keys.privateKey, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(asn1.toDer(info).getBytes(), 'latin1')
  ).toString('latin1')
}

for (const parameters of [true, false]) {
  test(`patched RSA verification accepts valid SHA-256 with NULL parameters: ${parameters}`, () => {
    assert.equal(publicKey.verify(digest, signature({ parameters })), true)
  })
  test(`patched RSA verification rejects nested garbage with NULL parameters: ${parameters}`, () => {
    const malformed = signature({ parameters, extra: [element(asn1.Type.OCTETSTRING, 'unconsumed')] })
    assert.throws(() => publicKey.verify(digest, malformed), /DigestInfo/)
  })
}

test('patched RSA verification rejects an extra nested NULL element', () => {
  assert.throws(() => publicKey.verify(digest, signature({ extra: [element(asn1.Type.NULL, '')] })), /DigestInfo/)
})

test('patched RSA verification still rejects a different message', () => {
  const other = createHash('sha256').update('a different synthetic message').digest('latin1')
  assert.equal(publicKey.verify(other, signature()), false)
})

test('RSA-PSS signing and verification remain compatible', () => {
  const pss = () =>
    forge.pss.create({
      md: forge.md.sha256.create(),
      mgf: forge.mgf.mgf1.create(forge.md.sha256.create()),
      saltLength: 32
    })
  const md = forge.md.sha256.create().update(message)
  assert.equal(publicKey.verify(digest, privateKey.sign(md, pss()), pss()), true)
})

function certificatePem() {
  const certificate = forge.pki.createCertificate()
  certificate.publicKey = publicKey
  certificate.serialNumber = '01'
  certificate.validity.notBefore = new Date('2020-01-01T00:00:00Z')
  certificate.validity.notAfter = new Date('2035-01-01T00:00:00Z')
  const subject = [
    { name: 'commonName', value: 'Ray synthetic signing fixture' },
    { name: 'organizationName', value: 'Ray fixture organization' },
    { name: 'organizationalUnitName', value: 'RAYTEST123' }
  ]
  certificate.setSubject(subject)
  certificate.setIssuer(subject)
  certificate.sign(privateKey, forge.md.sha256.create())
  return forge.pki.certificateToPem(certificate)
}

test('certificate parsing and valid certificate signatures remain compatible', () => {
  const certificate = forge.pki.certificateFromPem(certificatePem())
  assert.equal(certificate.subject.getField('CN').value, 'Ray synthetic signing fixture')
  assert.equal(certificate.subject.getField('O').value, 'Ray fixture organization')
  assert.equal(certificate.subject.getField('OU').value, 'RAYTEST123')
  assert.equal(certificate.verify(certificate), true)
})

test('Expo update code signing shares the patched verifier and preserves signatures and CSRs', () => {
  const signingPath = cliRequire.resolve('@expo/code-signing-certificates')
  assert.equal(createRequire(signingPath)('node-forge'), forge)
  const signing = cliRequire('@expo/code-signing-certificates')
  const keyPair = { publicKey, privateKey }
  const certificate = signing.generateSelfSignedCodeSigningCertificate({
    keyPair,
    validityNotBefore: new Date('2020-01-01T00:00:00Z'),
    validityNotAfter: new Date('2035-01-01T00:00:00Z'),
    commonName: 'Ray synthetic update certificate'
  })
  signing.validateSelfSignedCertificate(certificate, keyPair)
  const signed = signing.signBufferRSASHA256AndVerify(privateKey, certificate, Buffer.from(message))
  assert.equal(verify('sha256', Buffer.from(message), keys.publicKey, Buffer.from(signed, 'base64')), true)
  const csr = signing.convertCSRPEMToCSR(signing.convertCSRToCSRPEM(signing.generateCSR(keyPair, 'Ray fixture')))
  assert.equal(csr.verify(), true)
})

test('the actual Expo signing adapter can read synthetic certificate metadata without accessing Keychain', async () => {
  const spawnPath = cliRequire.resolve('@expo/spawn-async')
  const securityPath = join(dirname(cliManifest), 'build/src/run/ios/codeSigning/Security.js')
  const previousSpawn = require.cache[spawnPath]
  const previousSecurity = require.cache[securityPath]
  let calls = 0
  require.cache[spawnPath] = {
    exports: async (command, args) => {
      assert.equal(command, 'security')
      assert.deepEqual(args, ['find-certificate', '-c', 'RAY_FIXTURE_ID', '-p'])
      calls++
      return { stdout: certificatePem() }
    }
  }
  delete require.cache[securityPath]
  try {
    const security = require(securityPath)
    assert.deepEqual(await security.resolveCertificateSigningInfoAsync('RAY_FIXTURE_ID'), {
      signingCertificateId: 'RAY_FIXTURE_ID',
      codeSigningInfo: 'Ray synthetic signing fixture',
      appleTeamName: 'Ray fixture organization',
      appleTeamId: 'RAYTEST123'
    })
    assert.equal(calls, 1)
  } finally {
    if (previousSpawn) require.cache[spawnPath] = previousSpawn
    else delete require.cache[spawnPath]
    if (previousSecurity) require.cache[securityPath] = previousSecurity
    else delete require.cache[securityPath]
  }
})
