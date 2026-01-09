import { createHmac, randomUUID } from 'crypto'

import { EmailSender } from '../types'

export interface EmailConfig {
  from: string
  accessKeyId: string
  accessKeySecret: string
  accountName: string
  fromAlias?: string
  replyToAddress?: boolean
  addressType?: number
  endpoint?: string
}

export const createEmailSender = (config: EmailConfig): EmailSender => {
  if (!config?.accessKeyId || !config.accessKeySecret || !config.accountName) {
    throw new Error('Aliyun DM config is missing')
  }

  const endpoint = config.endpoint ?? 'https://dm.aliyuncs.com/'
  const replyToAddress = config.replyToAddress ?? true
  const addressType = config.addressType ?? 1

  return async ({ to, subject, html, text }) => {
    const parameters: Record<string, string> = {
      Action: 'SingleSendMail',
      Version: '2015-11-23',
      Format: 'JSON',
      AccessKeyId: config.accessKeyId,
      SignatureMethod: 'HMAC-SHA1',
      SignatureVersion: '1.0',
      SignatureNonce: randomUUID(),
      Timestamp: new Date().toISOString(),
      AccountName: config.accountName,
      ReplyToAddress: replyToAddress ? 'true' : 'false',
      AddressType: String(addressType),
      ToAddress: to,
      Subject: subject
    }

    if (config.fromAlias) {
      parameters['FromAlias'] = config.fromAlias
    }

    if (html) {
      parameters['HtmlBody'] = html
    }

    if (text) {
      parameters['TextBody'] = text
    }

    parameters['Signature'] = signAliyunRequest(parameters, config.accessKeySecret)

    const body = new URLSearchParams(parameters).toString()
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    })

    if (!response.ok) {
      throw new Error(`Aliyun DM email failed: ${response.status} ${response.statusText}`)
    }
  }
}

const signAliyunRequest = (parameters: Record<string, string>, accessKeySecret: string): string => {
  const sortedKeys = Object.keys(parameters).sort()
  const canonicalized = sortedKeys.map(key => `${percentEncode(key)}=${percentEncode(parameters[key])}`).join('&')

  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`
  return createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64')
}

const percentEncode = (value: string): string => {
  return encodeURIComponent(value).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
}
