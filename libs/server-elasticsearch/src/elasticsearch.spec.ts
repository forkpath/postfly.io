import { ConfigModule } from '@nestjs/config'
import { Test } from '@nestjs/testing'

import { describe, expect, it } from 'vitest'

import { ElasticsearchModule, ElasticsearchService } from './index'

describe('optional Elasticsearch adapter', () => {
  it('passes configuration to the SDK and exposes the service through Nest', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              elasticsearch: {
                host: 'localhost',
                port: 9200,
                apiKey: 'test-key',
                maxRetries: 2,
                requestTimeout: 1500,
                dataIndex: 'test'
              }
            })
          ]
        }),
        ElasticsearchModule.register()
      ]
    }).compile()
    expect(module.get(ElasticsearchService)).toBeDefined()
    expect(module.get('ELASTICSEARCH_MODULE_OPTIONS')).toEqual(
      expect.objectContaining({
        node: 'http://localhost:9200',
        auth: { apiKey: 'test-key' },
        maxRetries: 2,
        requestTimeout: 1500
      })
    )
    await module.close()
  })
})
