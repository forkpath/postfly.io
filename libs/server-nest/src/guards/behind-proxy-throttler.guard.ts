import { Injectable } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'

@Injectable()
export class BehindProxyThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const forwardedIps = Array.isArray(req['ips']) ? req['ips'] : []
    const forwardedIp = forwardedIps.find((value): value is string => typeof value === 'string')
    const directIp = typeof req['ip'] === 'string' ? req['ip'] : undefined

    return forwardedIp ?? directIp ?? 'unknown'
  }
}
