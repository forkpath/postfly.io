import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { _electron as electron } from '@playwright/test'

import { executable, mockAuth, outputDirectory, packageTest, reportDirectory } from './test-utils.mjs'

packageTest()
const userData = await mkdtemp(path.join(os.tmpdir(), 'ray-e2e-'))
const reports = await reportDirectory('e2e')
const app = await electron.launch({
  executablePath: await executable(outputDirectory()),
  args: [`--user-data-dir=${userData}`],
  timeout: 60000
})
try {
  await mockAuth(app)
  const page = await app.firstWindow({ timeout: 30000 })
  page.on('pageerror', error => console.error('Renderer error:', error.message))
  page.on('console', message => {
    if (message.type() === 'error') console.error(message.text())
  })
  await page.reload()
  await page.getByTestId('updates-open').waitFor()
  await page.waitForURL(/#\/auth\/login/)
  await page.reload()
  await page.getByTestId('updates-open').click()
  await page.getByTestId('updates-status').waitFor()
  const state = await page.evaluate(() => window.electronAPI.updates.getState())
  assert.equal(state.status, 'unconfigured')
  assert.equal(await page.evaluate(() => typeof window.require), 'undefined')
  await page.evaluate(() => window.electronAPI.maximize())
  await page.waitForFunction(async () => window.electronAPI.isMaximized())
  await page.evaluate(() => window.electronAPI.unmaximize())
  await page.waitForFunction(async () => !(await window.electronAPI.isMaximized()))
  await page.screenshot({ path: path.join(reports, 'updates.png') })
  await app.context().unroute('**/api/**')
  await app.context().route('**/api/**', route => route.abort('internetdisconnected'))
  await page.reload()
  await page.getByTestId('updates-open').click()
  await page.getByTestId('updates-status').waitFor()
  console.log('Packaged Electron UI, preload, route reload and window IPC passed')
} catch (error) {
  for (const [i, page] of app.windows().entries())
    await page.screenshot({ path: path.join(reports, `failure-${i}.png`) }).catch(() => undefined)
  throw error
} finally {
  await app.close()
  await rm(userData, { recursive: true, force: true })
}
