import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { chromium, expect } from '@playwright/test'

const extension = path.resolve('build/chrome-mv3')
const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'))
assert.equal(manifest.manifest_version, 3)
const reports = path.resolve('../../dist/extension/smoke')
await rm(reports, { recursive: true, force: true })
await mkdir(reports, { recursive: true })
const profile = await mkdtemp(path.join(os.tmpdir(), 'ray-extension-smoke-'))
let context
const errors = []
try {
  // Extension sideloading requires Playwright Chromium and a persistent context.
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
  })
  await context.tracing.start({ screenshots: true, snapshots: true })
  // Only the authentication boundary is stubbed; extension messaging/storage are real.
  await context.route('**/api/auth/**', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  )
  const worker = context.serviceWorkers()[0] || (await context.waitForEvent('serviceworker', { timeout: 30000 }))
  const extensionId = new URL(worker.url()).host
  const pages = ['popup', 'options', 'sidepanel', 'newtab', 'tabs']
  for (const name of pages) {
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(`${name}: ${error.message}`))
    await page.goto(`chrome-extension://${extensionId}/${name}.html`)
    // This text is returned by the actual background worker through WebExtension messaging.
    await expect(page.locator('main code')).toHaveText(`app/${name}`, { timeout: 30000 })
    await page.reload()
    await expect(page.locator('main code')).toHaveText(`app/${name}`)
    await page.screenshot({ path: path.join(reports, `${name}.png`), fullPage: true })
    await page.close()
  }
  // Exercise the actual content script and its shadow-root UI on a local fixture.
  const contentUrl = 'http://127.0.0.1:4178/extension-smoke'
  await context.route(contentUrl, route =>
    route.fulfill({ contentType: 'text/html', body: '<html><body><h1>Content host</h1></body></html>' })
  )
  const contentPage = await context.newPage()
  contentPage.on('pageerror', error => errors.push(`content: ${error.message}`))
  await contentPage.goto(contentUrl)
  const contentButton = contentPage.getByRole('button', { name: 'Content script UI' })
  await expect(contentButton).toBeVisible()
  const dialog = contentPage.waitForEvent('dialog').then(async alert => {
    assert.equal(alert.message(), 'This is injected UI!')
    await alert.accept()
  })
  await contentButton.click()
  await dialog
  await contentPage.screenshot({ path: path.join(reports, 'content.png') })
  await contentPage.close()
  const storageValue = await worker.evaluate(async () => {
    await globalThis.chrome.storage.local.set({ smokeMarker: 'isolated-install' })
    return (await globalThis.chrome.storage.local.get('smokeMarker')).smokeMarker
  })
  assert.equal(storageValue, 'isolated-install')
  assert.deepEqual(errors, [])
  await writeFile(
    path.join(reports, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        pages,
        checks: ['background-messaging', 'reload', 'storage', 'content-script'],
        version: manifest.version
      },
      null,
      2
    )
  )
  console.log('Real Chromium extension pages, background messaging and storage passed')
} catch (error) {
  for (const [index, page] of (context?.pages() || []).entries())
    await page.screenshot({ path: path.join(reports, `failure-${index}.png`) }).catch(() => undefined)
  throw error
} finally {
  await writeFile(path.join(reports, 'errors.json'), JSON.stringify(errors))
  await context?.tracing.stop({ path: path.join(reports, 'trace.zip') })
  await context?.close()
  await rm(profile, { recursive: true, force: true })
}
