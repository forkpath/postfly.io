import { createHash, createHmac } from 'crypto'

import { EmailSender } from '../types'

export interface EmailConfig {
  from: string
  accessKeyId: string
  accessKeySecret: string
  region: string
  endpoint?: string
}

export const createEmailSender = (config: EmailConfig): EmailSender => {
  if (!config?.accessKeyId || !config.accessKeySecret || !config.region) {
    throw new Error('AWS SES config is missing')
  }

  const from = config.from
  const endpoint = config.endpoint ?? `https://email.${config.region}.amazonaws.com/v2/email/outbound-emails`

  return async ({ to, subject, html, text }) => {
    const payload: Record<string, unknown> = {
      FromEmailAddress: from,
      Destination: {
        ToAddresses: [to]
      },
      Content: {
        Simple: {
          Subject: { Data: subject },
          Body: {
            ...(html ? { Html: { Data: html } } : {}),
            ...(text ? { Text: { Data: text } } : {})
          }
        }
      }
    }

    const body = JSON.stringify(payload)
    const headers = signAwsRequest({
      method: 'POST',
      url: endpoint,
      region: config.region,
      service: 'ses',
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.accessKeySecret,
      body
    })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    })

    if (!response.ok) {
      throw new Error(`AWS SES email failed: ${response.status} ${response.statusText}`)
    }
  }
}

const signAwsRequest = (args: {
  method: string
  url: string
  region: string
  service: string
  accessKeyId: string
  secretAccessKey: string
  body: string
}): Record<string, string> => {
  const url = new URL(args.url)
  const amzDate = formatAwsDate(new Date())
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = hashSha256(args.body)

  const canonicalUri = url.pathname
  const canonicalQuery = buildCanonicalQuery(url)
  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${url.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`
  ].join('\n')

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'
  const canonicalRequest = [
    args.method,
    canonicalUri,
    canonicalQuery,
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash
  ].join('\n')

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${args.region}/${args.service}/aws4_request`
  const stringToSign = [algorithm, amzDate, credentialScope, hashSha256(canonicalRequest)].join('\n')

  const signingKey = getAwsSignatureKey(args.secretAccessKey, dateStamp, args.region, args.service)
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex')

  return {
    'Content-Type': 'application/json',
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': payloadHash,
    Authorization: `${algorithm} Credential=${args.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  }
}

const hashSha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex')

const formatAwsDate = (date: Date): string => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  )
}

const buildCanonicalQuery = (url: URL): string => {
  if (!url.searchParams || Array.from(url.searchParams.keys()).length === 0) {
    return ''
  }

  return Array.from(url.searchParams.entries())
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

const getAwsSignatureKey = (secretAccessKey: string, dateStamp: string, region: string, service: string) => {
  const kDate = createHmac('sha256', `AWS4${secretAccessKey}`).update(dateStamp).digest()
  const kRegion = createHmac('sha256', kDate).update(region).digest()
  const kService = createHmac('sha256', kRegion).update(service).digest()
  return createHmac('sha256', kService).update('aws4_request').digest()
}
