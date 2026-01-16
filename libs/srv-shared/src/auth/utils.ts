import type { ExecutionContext } from '@nestjs/common'

/**
 * 从 ExecutionContext 中提取 Request 对象（HTTP / WS）。
 * @param context - 当前执行上下文
 */
export function getRequestFromContext(context: ExecutionContext) {
  const contextType = context.getType()

  // ray框架不会使用graphql接口，所以这里不需要处理
  //   if (contextType === 'graphql') {
  //     return GqlExecutionContext.create(context).getContext().req
  //   }

  if (contextType === 'ws') {
    return context.switchToWs().getClient()
  }

  return context.switchToHttp().getRequest()
}
