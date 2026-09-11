import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  })
  app.enableShutdownHooks()
  const port = Number(process.env['WORKER_PORT'] || 3002)
  await app.listen(port)
  Logger.log(`Worker readiness endpoint is running on: http://localhost:${port}/ready`)
}

bootstrap().catch(error => {
  Logger.error(`Worker start failed: ${error}`)
  process.exit(1)
})
