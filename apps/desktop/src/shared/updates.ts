export interface UpdateState {
  status: 'unconfigured' | 'idle' | 'checking' | 'not-available' | 'available' | 'downloading' | 'downloaded' | 'error'
  currentVersion: string
  version?: string
  percent?: number
  error?: 'check-failed' | 'download-failed'
}

export interface UpdateAPI {
  getState(): Promise<UpdateState>
  check(): Promise<UpdateState>
  download(): Promise<UpdateState>
  install(): Promise<UpdateState>
  onStateChange(callback: (state: UpdateState) => void): () => void
}

export const updateChannels = {
  getState: 'updates:get-state',
  check: 'updates:check',
  download: 'updates:download',
  install: 'updates:install',
  changed: 'updates:changed'
} as const
