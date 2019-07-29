// manually implemented lodash functions are better than even:
// https://github.com/lodash/babel-plugin-lodash
// additional tiny versions of lodash functions are available in VueScript2

import type { JSONObject } from '~/shared/types.js'

export function mapValues (obj: Object, fn: Function, o: Object = {}) {
  for (const key in obj) { o[key] = fn(obj[key]) }
  return o
}

export function pick (o: Object, props: Array<*>) {
  var x = {}
  for (const k of props) { x[k] = o[k] }
  return x
}

export function cloneDeep (obj: JSONObject) {
  return JSON.parse(JSON.stringify(obj))
}

function isMergeableObject (val) {
  var nonNullObject = val && typeof val === 'object'
  return nonNullObject && Object.prototype.toString.call(val) !== '[object RegExp]' && Object.prototype.toString.call(val) !== '[object Date]'
}

export function merge (obj: Object, src: Object) {
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

export function debounce (func: Function, wait: number, options?: Object) {
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

export function flatten (arr: Array<*>) {
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

export function zip () {
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

export function fromPairs (arr: Array<*>) {
  const obj = {}
  for (const [key, value] of arr) {
    obj[key] = value
  }
  return obj
}
