export interface ElasticsearchConfig {
  host: string
  port: number
  apiKey: string
  maxRetries: number
  requestTimeout: number
  dataIndex: string
}
