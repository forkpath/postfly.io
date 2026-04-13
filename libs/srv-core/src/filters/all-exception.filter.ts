import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Logger } from '@nestjs/common'

import { Request, Response } from 'express'
import { I18nService } from 'nestjs-i18n'

import { captureException } from '@libs/monitoring/server'

import { ExceptionResponse } from '../exception'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  constructor(@Inject(I18nService) private readonly i18n: I18nService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
    // const errorResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal Server Error'

    let message: string | object = 'Internal Server Error'
    let stackTrace = undefined

    if (exception instanceof ExceptionResponse) {
      // 自定义异常：ExceptionResponse 中存了翻译 key 和参数
      const lang = request.headers['accept-language'] || 'zh'
      message = this.i18n.t(exception.key, { lang, args: exception.args })
      stackTrace = exception.stack
    } else if (exception instanceof HttpException) {
      const res = exception.getResponse()
      message = typeof res === 'string' ? res : (res as any).message || exception.message
      stackTrace = exception.stack
    } else if (exception instanceof Error) {
      message = exception.message
      stackTrace = exception.stack
    }

    const is5xx = status >= HttpStatus.INTERNAL_SERVER_ERROR && status < 600

    const report5xxToMonitoring = () => {
      if (!is5xx) {
        return
      }
      try {
        captureException(exception, {
          scope: 'srv-core-all-exceptions-filter',
          httpStatus: status,
          method: request.method,
          path: request.url
        })
      } catch {
        /* monitoring must never break the HTTP error path */
      }
    }

    // 检查响应是否已经发送
    if (response.headersSent) {
      this.logger.error(`Response already sent, unable to write error response`)
      this.logger.error(`Error Message: ${message}`)
      if (stackTrace) this.logger.error(`Stack Trace:\n${stackTrace}`)
      report5xxToMonitoring()
      return
    }

    report5xxToMonitoring()

    // 输出到日志
    this.logger.error(`HTTP Status: ${status}, Message: ${message}`)
    if (stackTrace) {
      this.logger.error(`Stack Trace:\n${stackTrace}`)
    }

    // 返回JSON格式
    response.status(status).json({
      code: status,
      msg: message
    })
  }
}
