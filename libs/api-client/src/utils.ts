/**
 * 兼容 ref 仓库的 Hono handle helper，在 axios 客户端下作为轻量占位实现。
 * 实际推荐使用 `createQueryOptionsFactory / createMutationFactory`。
 */
export function handle<Args extends unknown[], Result>(fn: (...args: Args) => Result, options?: { schema?: unknown }) {
  // Kept for source compatibility; validation belongs to the API factories.
  void options
  return (...args: Args): Result => fn(...args)
}
