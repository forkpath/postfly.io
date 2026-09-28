export interface PlatformRetryQueue {
  readonly name: string
  readonly delayMs: number
}

// Every message in a queue has the same TTL. A shorter retry therefore cannot
// expire behind a longer lease/backoff at the head of that queue.
export const PLATFORM_RETRY_QUEUES: readonly PlatformRetryQueue[] = [
  1000, 2000, 5000, 10000, 20000, 30000, 60000, 120000, 360000
].map(delayMs => ({ name: `platform.smoke.retry.${delayMs}`, delayMs }))

export function platformRetryQueue(delayMs: number): PlatformRetryQueue {
  if (!Number.isFinite(delayMs) || delayMs <= 0) throw new RangeError('Retry delay must be positive and finite')
  const queue = PLATFORM_RETRY_QUEUES.find(candidate => candidate.delayMs >= delayMs)
  if (!queue) throw new RangeError('Retry delay exceeds the supported maximum of 360000ms')
  return queue
}
