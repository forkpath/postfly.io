import type { ServerRuntimeConfig } from './runtime-config'

describe('ServerRuntimeConfig', () => {
  it('keeps platform configuration serializable and framework independent', () => {
    const config = {
      server: { enginePort: 6006, corsOrigins: '*' },
      redis: { host: 'localhost', port: 6379, password: '' },
      mongo: { host: 'localhost', port: 27017, username: 'user', password: 'password', database: 'ray' },
      cache: { host: 'localhost', port: 6379, password: '', ttl: 60, db: 0 },
      logger: {
        level: 'info',
        scope: 'ray',
        fileEnabled: false,
        fileSizeLimit: '20M',
        fileExpiredIn: '14d',
        compress: false
      },
      i18n: { fallbackLng: 'en', localePath: 'translations' },
      throttler: { ttl: 60, limit: 10, storage: { type: 'memory' } },
      storage: { accessKeyId: 'id', accessKeySecret: 'secret', region: 'local', bucket: 'ray' },
      sms: { accessKeyId: 'id', accessKeySecret: 'secret', signName: 'ray' },
      rabbitmq: { uri: 'amqp://localhost', exchangeName: 'ray', exchangeType: 'topic' },
      elasticsearch: {
        host: 'localhost',
        port: 9200,
        apiKey: 'key',
        maxRetries: 3,
        requestTimeout: 30000,
        dataIndex: 'ray'
      }
    } satisfies ServerRuntimeConfig

    expect(JSON.parse(JSON.stringify(config))).toEqual(config)
  })
})
