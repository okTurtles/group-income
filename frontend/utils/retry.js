'use strict'

import { delay } from 'turtledash'

// Calls `fn` until it resolves, at most `attempts` times, waiting `delayMs`
// between attempts. Resolves with the result of the first attempt that
// succeeds, or rejects with the error of the last attempt. `onRetry` is called
// with the error of every attempt that is followed by another one; an error
// that it throws is logged, and doesn't stop the remaining attempts.
export async function retry<T> (
  fn: (attempt: number) => Promise<T>,
  { attempts, delayMs, onRetry }: { attempts: number, delayMs: number, onRetry?: (e: any, attempt: number) => void }
): Promise<T> {
  for (let attempt = 1; attempt < attempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (e) {
      try {
        onRetry?.(e, attempt)
      } catch (hookError) {
        console.error('[retry] onRetry threw', hookError)
      }
    }
    await delay(delayMs)
  }
  return fn(Math.max(attempts, 1))
}
