import { Controller, Get } from '@nestjs/common'

import { AllowAnonymous } from '@libs/auth-server/nest'

import { AppService } from './app.service'

@Controller()
@AllowAnonymous()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getData() {
    return this.appService.getData()
  }
}
