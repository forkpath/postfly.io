import './instrument'

import { ConfigService } from '@nestjs/config'

import { LoggerService, ServerConfig } from '@libs/server-nest'

import { createEngineApplication } from './application'

async function bootstrap() {
  const app = await createEngineApplication()
  app.enableShutdownHooks()
  const { enginePort } = app.get(ConfigService).getOrThrow<ServerConfig>('server')
  await app.listen(enginePort)
  app.get(LoggerService).log(`Engine is running on: http://localhost:${enginePort}/api/v1`)
}

bootstrap().catch(error => {
  console.error('Engine start failed:', error)
  process.exit(1)
})
