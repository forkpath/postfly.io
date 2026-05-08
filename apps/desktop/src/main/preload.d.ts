export interface ElectronWindowAPI {
  minimize: () => void
  maximize: () => void
  unmaximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
  platform: NodeJS.Platform
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Window {
    electronAPI: ElectronWindowAPI
  }
}

export {}
