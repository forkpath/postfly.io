import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app/app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  })

  app.enableShutdownHooks()

  const port = process.env.PULSE_PORT || process.env.PORT || 3001

  await app.listen(port)
  Logger.log(`Pulse is running on: http://localhost:${port}`)
}

bootstrap().catch(error => {
  Logger.error(`Pulse start failed: ${error}`)
  process.exit(1)
})
