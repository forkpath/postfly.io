import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { WsAdapter } from '@nestjs/platform-ws'

import { AppModule } from './app/app.module'
import { PulseGateway } from './app/pulse.gateway'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  })

  app.useWebSocketAdapter(new WsAdapter(app))

  app.enableShutdownHooks()

  const gateway = app.get(PulseGateway)
  process.on('SIGHUP', () => gateway.beginDrain())
  process.on('SIGCONT', () => gateway.resumeTraffic())

  const port = process.env.PULSE_PORT || process.env.PORT || 3001

  await app.listen(port)
  Logger.log(`Pulse is running on: http://localhost:${port}`)
}

bootstrap().catch(error => {
  Logger.error(`Pulse start failed: ${error}`)
  process.exit(1)
})
