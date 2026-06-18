import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app/app.module'

const keepProcessAlive = () => setInterval(() => undefined, 2_147_483_647)

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true
  })

  const keepAlive = keepProcessAlive()
  let isShuttingDown = false

  const shutdown = async (signal: NodeJS.Signals) => {
    if (isShuttingDown) {
      return
    }

    isShuttingDown = true
    Logger.log(`Worker received ${signal}, shutting down`)
    clearInterval(keepAlive)
    await app.close()
    process.exit(0)
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  Logger.log('Worker application context is running')
}

bootstrap().catch(error => {
  Logger.error(`Worker start failed: ${error}`)
  process.exit(1)
})
