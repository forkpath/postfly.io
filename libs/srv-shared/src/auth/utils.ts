import type { ExecutionContext } from '@nestjs/common'

/**
 * Extracts the request object from either HTTP or WebSocket execution context
 * @param context - The execution context
 * @returns The request object
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
