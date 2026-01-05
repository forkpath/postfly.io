export interface ThrottlerConfig {
  ttl: number
  limit: number
  storage:
    | {
        type: 'memory'
      }
    | {
        type: 'redis'
        redis: {
          host: string
          port: number
          password: string
          db: number
        }
      }
}
