import { readFileSync } from 'node:fs'
import path from 'node:path'

import { app } from 'electron'
import electronUpdater from 'electron-updater'

import { UpdateService } from './service'

const { autoUpdater } = electronUpdater

export function createUpdateService() {
  const metadata = JSON.parse(readFileSync(path.join(app.getAppPath(), 'package.json'), 'utf8')) as {
    desktopUpdatesEnabled?: boolean
  }
  const enabled = app.isPackaged && metadata.desktopUpdatesEnabled === true
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowDowngrade = false
  autoUpdater.allowPrerelease = false
  autoUpdater.logger = console
  const service = new UpdateService(
    {
      check: () => autoUpdater.checkForUpdates(),
      download: () => autoUpdater.downloadUpdate(),
      install: () => {
        setImmediate(() => autoUpdater.quitAndInstall(true, true))
      },
      listen(events) {
        const available = (info: { version: string }) => events.available(info.version)
        const progress = (info: { percent: number }) => events.progress(info.percent)
        const downloaded = (info: { version: string }) => events.downloaded(info.version)
        autoUpdater.on('update-available', available)
        autoUpdater.on('update-not-available', events.unavailable)
        autoUpdater.on('download-progress', progress)
        autoUpdater.on('update-downloaded', downloaded)
        autoUpdater.on('error', events.error)
        return () => {
          autoUpdater.removeListener('update-available', available)
          autoUpdater.removeListener('update-not-available', events.unavailable)
          autoUpdater.removeListener('download-progress', progress)
          autoUpdater.removeListener('update-downloaded', downloaded)
          autoUpdater.removeListener('error', events.error)
        }
      }
    },
    app.getVersion(),
    enabled
  )
  let startup: ReturnType<typeof setTimeout> | undefined
  let interval: ReturnType<typeof setInterval> | undefined
  return {
    service,
    start() {
      if (!enabled || startup) return
      startup = setTimeout(() => {
        void service.check()
      }, 10_000)
      interval = setInterval(
        () => {
          void service.check()
        },
        6 * 60 * 60 * 1000
      )
      startup.unref()
      interval.unref()
    },
    dispose() {
      clearTimeout(startup)
      clearInterval(interval)
      service.dispose()
    }
  }
}
