import { createHmac, randomUUID } from 'crypto'
import type { EmailSender } from '../types'

import { env } from './env'

const from = env.EMAIL_FROM
const replyToAddress = env.ALIYUN_DM_REPLY_TO_ADDRESS ? env.ALIYUN_DM_REPLY_TO_ADDRESS === 'true' : true
const addressType = env.ALIYUN_DM_ADDRESS_TYPE ? Number(env.ALIYUN_DM_ADDRESS_TYPE) : 1

export const send: EmailSender = async ({ to, subject, html, text }) => {
  const parameters: Record<string, string> = {
    Action: 'SingleSendMail',
    Version: '2015-11-23',
    Format: 'JSON',
    AccessKeyId: env.ALIYUN_DM_ACCESS_KEY_ID,
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: randomUUID(),
    Timestamp: new Date().toISOString(),
    AccountName: env.ALIYUN_DM_ACCOUNT_NAME,
    FromAlias: from,
    ReplyToAddress: replyToAddress ? 'true' : 'false',
    AddressType: String(addressType),
    ToAddress: to,
    Subject: subject
  }

  if (html) {
    parameters['HtmlBody'] = html
  }

  if (text) {
    parameters['TextBody'] = text
  }

  parameters['Signature'] = signAliyunRequest(parameters, env.ALIYUN_DM_ACCESS_KEY_SECRET)

  const body = new URLSearchParams(parameters).toString()
  const response = await fetch('https://dm.aliyuncs.com/', {
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

const signAliyunRequest = (parameters: Record<string, string>, accessKeySecret: string): string => {
  const sortedKeys = Object.keys(parameters).sort()
  const canonicalized = sortedKeys.map(key => `${percentEncode(key)}=${percentEncode(parameters[key])}`).join('&')

  const stringToSign = `POST&${percentEncode('/')}&${percentEncode(canonicalized)}`
  return createHmac('sha1', `${accessKeySecret}&`).update(stringToSign).digest('base64')
}

const percentEncode = (value: string): string => {
  return encodeURIComponent(value).replace(/\+/g, '%20').replace(/\*/g, '%2A').replace(/%7E/g, '~')
}
