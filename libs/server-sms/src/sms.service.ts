import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import Client, * as $Dysmsapi from '@alicloud/dysmsapi20170525'
import * as OpenApi from '@alicloud/openapi-client'

import { SmsConfig } from './sms.config'

@Injectable()
export class SmsService {
  client: Client
  signName: string

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const { accessKeyId, accessKeySecret, signName } = configService.getOrThrow<SmsConfig>('sms')
    if (!accessKeyId || !accessKeySecret || !signName) {
      throw new Error('SMS requires accessKeyId, accessKeySecret and signName')
    }
    const config = new OpenApi.Config({
      accessKeyId,
      accessKeySecret
    })
    // Endpoint 请参考 https://api.aliyun.com/product/Dysmsapi
    config.endpoint = `dysmsapi.aliyuncs.com`
    this.client = new Client(config)
    this.signName = signName
  }

  // templateParam is the JSON string of provider-approved template variables.
  async send(phoneNumbers: string, templateCode: string, templateParam: string) {
    const request = new $Dysmsapi.SendSmsRequest({})
    request.phoneNumbers = phoneNumbers
    request.signName = this.signName
    request.templateCode = templateCode
    request.templateParam = templateParam
    const response = await this.client.sendSms(request)
    if (response.body?.code !== 'OK') {
      throw new Error(`SMS provider rejected delivery: ${response.body?.code ?? 'UNKNOWN'}`)
    }
    return response
  }
}
