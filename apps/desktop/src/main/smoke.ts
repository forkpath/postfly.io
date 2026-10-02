import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { BrowserWindow } from 'electron'

import { app } from 'electron'

// Explicit local CLI diagnostic: fixed facts only, no URL or script supplied by callers.
export function registerSmokeReport(window: BrowserWindow) {
  if (!process.argv.includes('--desktop-smoke')) return
  const timeout = setTimeout(() => app.exit(1), 30_000)
  window.webContents.once('did-finish-load', () => {
    void (async () => {
      // Wait for React to mount, not merely for the HTML shell to load.
      await window.webContents.executeJavaScript(`new Promise(resolve => {
        const timer = setInterval(() => {
          if (document.querySelector('[data-testid="updates-open"]')) {
            clearInterval(timer); resolve(true)
          }
        }, 100)
      })`)
      const facts = (await window.webContents.executeJavaScript(`({
        preload: typeof window.electronAPI?.updates?.getState === 'function',
        nodeIntegration: typeof window.require !== 'undefined',
        entry: document.querySelector('[data-testid="updates-open"]') !== null
      })`)) as { preload: boolean; nodeIntegration: boolean; entry: boolean }
      const report = { ...facts, version: app.getVersion(), packaged: app.isPackaged }
      await writeFile(path.join(app.getPath('userData'), 'desktop-smoke.json'), JSON.stringify(report))
      clearTimeout(timeout)
      app.exit(report.preload && report.entry && !report.nodeIntegration && report.packaged ? 0 : 1)
    })().catch(error => {
      console.error(error)
      app.exit(1)
    })
  })
}
