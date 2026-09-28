import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { test as base, chromium, expect } from '@playwright/test'

interface ExtensionFixtures {
  extensionId: string
  extensionErrors: string[]
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({ browserName }, use, testInfo) => {
    if (browserName !== 'chromium') throw new Error('Extension sideloading requires Chromium')
    const extension = path.resolve(
      import.meta.dirname,
      '..',
      process.env.EXTENSION_BUILD_DIR ?? 'build-e2e/chrome-mv3-e2e'
    )
    const manifest = JSON.parse(await readFile(path.join(extension, 'manifest.json'), 'utf8'))
    expect(manifest.manifest_version).toBe(3)
    const profile = await mkdtemp(path.join(os.tmpdir(), 'ray-extension-e2e-'))
    try {
      const context = await chromium.launchPersistentContext(profile, {
        channel: 'chromium',
        headless: true,
        args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
      })
      try {
        await context.tracing.start({ screenshots: true, snapshots: true, sources: true })
        // Stub only the external HTTP auth boundary. Extension messaging,
        // service workers, permissions and storage run in the actual browser.
        await context.route('**/api/auth/**', route =>
          route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
        )
        await use(context)
      } finally {
        try {
          if (testInfo.status !== testInfo.expectedStatus) {
            for (const [index, page] of context.pages().entries()) {
              const screenshot = testInfo.outputPath(`failure-${index}.png`)
              await page
                .screenshot({ path: screenshot })
                .then(() => testInfo.attach(`failure-${index}`, { path: screenshot, contentType: 'image/png' }))
                .catch(() => undefined)
            }
          }
          const trace = testInfo.outputPath('trace.zip')
          await context.tracing.stop({ path: trace })
          await testInfo.attach('trace', { path: trace, contentType: 'application/zip' })
        } finally {
          await context.close()
        }
      }
    } finally {
      await rm(profile, { recursive: true, force: true })
    }
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker', { timeout: 30000 }))
    await use(new URL(worker.url()).host)
  },
  extensionErrors: [
    async ({ context }, use, testInfo) => {
      const errors: string[] = []
      context.on('page', page => page.on('pageerror', error => errors.push(`${page.url()}: ${error.message}`)))
      await use(errors)
      await testInfo.attach('page-errors', { body: JSON.stringify(errors), contentType: 'application/json' })
      expect(errors).toEqual([])
    },
    { auto: true }
  ]
})

export { expect } from '@playwright/test'
