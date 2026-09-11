import type { NextFunction, Request, Response } from 'express'

import { json, urlencoded } from 'express'

/**
 * 创建一个 Nest 中间件：对指定 basePath 路由跳过 body 解析。
 */
export function SkipBodyParsingMiddleware(basePath = '/api/auth') {
  // Nest 的 consumer.apply() 可直接接收普通函数
  return (req: Request, res: Response, next: NextFunction): void => {
    // better-auth 路由跳过 body 解析
    if (req.baseUrl.startsWith(basePath)) {
      next()
      return
    }

    // 其他路由正常解析 body
    json()(req, res, err => {
      if (err) {
        next(err)
        return
      }
      urlencoded({ extended: true })(req, res, next)
    })
  }
}
