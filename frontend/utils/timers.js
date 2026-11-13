'use strict'

export type Timers = {
  setTimeout: (fn: () => mixed, ms: number) => any,
  clearTimeout: (id: any) => void,
  setInterval: (fn: () => mixed, ms: number) => any,
  clearInterval: (id: any) => void
}

// Wrapped, because browsers throw 'Illegal invocation' when these are called
// as methods of another object
export const defaultTimers: Timers = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => clearInterval(id)
}

// Calls `fn()` right away and settles like its result, or rejects with
// `message` after `ms`. `fn()` throwing is a rejection.
export const callWithTimeout = <T>(fn: () => Promise<T> | T, ms: number, message: string, timers: Timers = defaultTimers): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = timers.setTimeout(() => reject(new Error(message)), ms)
    new Promise<T>((resolve) => resolve(fn()))
      .finally(() => timers.clearTimeout(timer))
      .then(resolve, reject)
  })
