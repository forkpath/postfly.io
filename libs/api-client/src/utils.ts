/**
 * 兼容 ref 仓库的 Hono handle helper，在 axios 客户端下作为轻量占位实现。
 * 实际推荐使用 `createQueryOptionsFactory / createMutationFactory`。
 */
export function handle<T extends (...args: any[]) => unknown>(fn: T, _options?: { schema?: unknown }) {
  return (...args: Parameters<T>) => fn(...args)
}
