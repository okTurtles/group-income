'use strict'

// Calls `fn()` right away and settles like its result, or rejects with
// `message` after `ms`. `fn()` throwing is a rejection.
export const callWithTimeout = <T>(fn: () => Promise<T> | T, ms: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    new Promise<T>((resolve) => resolve(fn()))
      .finally(() => clearTimeout(timer))
      .then(resolve, reject)
  })
