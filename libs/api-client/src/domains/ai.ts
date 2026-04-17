/**
 * AI 聊天接口常量。客户端一般使用 @ai-sdk/react 的 `useChat`，此处仅暴露
 * 路径/URL 构造工具，便于 mobile / web 在 provider 层注入。
 */
export const aiKeys = {
  chat: ['ai', 'chat'] as const
} as const

export const aiEndpoints = {
  chat: '/ai/chat'
} as const

/** `origin` 为 Engine 根地址（不含 `/api/v1`），返回完整 chat URL。 */
export function getAIChatUrl(origin: string): string {
  const root = origin
    .trim()
    .replace(/\/$/, '')
    .replace(/\/api\/v1$/, '')
  return `${root}/api/v1${aiEndpoints.chat}`
}
