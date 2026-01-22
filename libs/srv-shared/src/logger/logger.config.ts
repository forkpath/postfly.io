import type { FileSize, Interval } from 'rotating-file-stream'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LoggerConfig {
  level: LogLevel
  scope: string
  fileEnabled: boolean
  fileSizeLimit: FileSize
  fileExpiredIn: Interval
  compress: boolean
}
