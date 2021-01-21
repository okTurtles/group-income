// manually implemented lodash functions are better than even:
// https://github.com/lodash/babel-plugin-lodash
// additional tiny versions of lodash functions are available in VueScript2

import type { JSONObject } from '~/shared/types.js'

export function mapValues (obj: Object, fn: Function, o: Object = {}): any {
  for (const key in obj) { o[key] = fn(obj[key]) }
  return o
}

export function mapObject (obj: Object, fn: Function): {[any]: any} {
  return Object.fromEntries(Object.entries(obj).map(fn))
}

export function pick (o: Object, props: string[]): {...} {
  const x = {}
  for (const k of props) { x[k] = o[k] }
  return x
}

export function omit (o: Object, props: string[]): {...} {
  const x = {}
  for (const k in o) {
    if (!props.includes(k)) {
      x[k] = o[k]
    }
  }
  return x
}

export function cloneDeep (obj: JSONObject): any {
  return JSON.parse(JSON.stringify(obj))
}

function isMergeableObject (val) {
  const nonNullObject = val && typeof val === 'object'
  return nonNullObject && Object.prototype.toString.call(val) !== '[object RegExp]' && Object.prototype.toString.call(val) !== '[object Date]'
}

export function merge (obj: Object, src: Object): any {
  for (const key in src) {
    const clone = isMergeableObject(src[key]) ? cloneDeep(src[key]) : undefined
    if (clone && isMergeableObject(obj[key])) {
      merge(obj[key], clone)
      continue
    }
    obj[key] = clone || src[key]
  }
  return obj
}

export function delay (msec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msec)
  })
}

export function randomIntFromRange (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function randomFromArray (arr: any[]): any {
  return arr[Math.floor(Math.random() * arr.length)]
}

// TODO: maybe a simplified version like this? https://github.com/component/debounce/blob/master/index.js
export function debounce (func: Function, wait: number, options?: Object): any {
  if (typeof func !== 'function') {
    throw new TypeError('Invalid Function')
  }
  let lastArgs: Array<mixed> | typeof undefined
  let lastThis
  let maxWait: number = 0
  let result
  let timerId
  let lastCallTime: number | typeof undefined
  let lastInvokeTime = 0
  let leading = false
  let trailing = true
  let maxing = false

  if (!wait && wait !== 0) {
    wait = 0
  }

  if (options) {
    leading = !!options.leading
    maxing = 'maxWait' in options
    maxWait = maxing ? Math.max(+options.maxWait || 0, wait) : maxWait
    trailing = 'trailing' in options ? !!options.trailing : trailing
  }

  function invokeFunc (time: number) {
    const args: Array<mixed> | typeof undefined = lastArgs
    const thisArg = lastThis

    lastArgs = lastThis = undefined
    lastInvokeTime = time
    result = func.apply(thisArg, args || [])
    return result
  }

  function shouldInvoke (time) {
    const timeSinceLastCall = time - Number(lastCallTime)
    const timeSinceLastInvoke = time - lastInvokeTime

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
    (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait))
  }

  function timerExpired () {
    const time = Date.now()
    if (shouldInvoke(time)) {
      timerId = undefined
      if (trailing && lastArgs) {
        return invokeFunc(time)
      }
      lastArgs = lastThis = undefined
      return result
    }
    // Restart the timer.
    const timeSinceLastCall = time - Number(lastCallTime)
    const timeSinceLastInvoke = time - lastInvokeTime
    const timeWaiting = wait - timeSinceLastCall
    const remainingWait = maxing ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting
    timerId = setTimeout(timerExpired, remainingWait)
  }
  function trailingEdge (time) {
    timerId = undefined

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = lastThis = undefined
    return result
  }

  function cancel () {
    if (timerId !== undefined) {
      clearTimeout(timerId)
    }
    lastInvokeTime = 0
    lastArgs = lastCallTime = lastThis = timerId = undefined
  }

  function flush () {
    return timerId === undefined ? result : trailingEdge(Date.now())
  }

  function pending () {
    return timerId !== undefined
  }

  function debounced (...args: any) {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastThis = this
    lastCallTime = time

    if (isInvoking) {
      if (timerId === undefined) {
        lastInvokeTime = lastCallTime
        timerId = setTimeout(timerExpired, wait)
        return leading ? invokeFunc(lastCallTime) : result
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait)
        return invokeFunc(lastCallTime)
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait)
    }
    return result
  }

  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending
  return debounced
}

export function flatten (arr: Array<*>): Array<any> {
  let flat: Array<*> = []
  for (let i = 0; i < arr.length; i++) {
    if (Array.isArray(arr[i])) {
      flat = flat.concat(arr[i])
    } else {
      flat.push(arr[i])
    }
  }
  return flat
}

export function zip (): any[] {
  const arr = Array.prototype.slice.call(arguments)
  const zipped = []
  let max = 0
  arr.forEach((current) => (max = Math.max(max, current.length)))
  for (const current of arr) {
    for (let i = 0; i < max; i++) {
      zipped[i] = zipped[i] || []
      zipped[i].push(current[i])
    }
  }
  return zipped
}

export function uniq (array: any[]): any[] {
  return Array.from(new Set(array))
}

export function union (...arrays: any[][]): any[] {
  return uniq([].concat.apply([], arrays))
}

export function intersection (a1: any[], ...arrays: any[][]): any[] {
  return uniq(a1).filter(v1 => arrays.every(v2 => v2.indexOf(v1) >= 0))
}

export function difference (a1: any[], ...arrays: any[][]): any[] {
  const a2 = [].concat.apply([], arrays)
  return a1.filter(v => a2.indexOf(v) === -1)
}

export function deepEqualJSONType (a: any, b: any): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof (a) !== typeof (b)) return false
  if (typeof a !== 'object') return a === b
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false
  } else if (a.constructor.name !== 'Object') {
    throw new Error(`not JSON type: ${a}`)
  }
  for (const key in a) {
    if (!deepEqualJSONType(a[key], b[key])) return false
  }
  return true
}
