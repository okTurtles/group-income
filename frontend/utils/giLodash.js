// manually implemented lodash functions are better than even:
// https://github.com/lodash/babel-plugin-lodash
// additional tiny versions of lodash functions are available in VueScript2

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

export function choose (array: Array<*>, indices: Array<number>): Array<*> {
  const x = []
  for (const idx of indices) { x.push(array[idx]) }
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

export function cloneDeep (obj: any): any {
  return JSON.parse(JSON.stringify(obj))
}

function isMergeableObject (val) {
  const nonNullObject = val && typeof val === 'object'
  // $FlowFixMe
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

export function randomBytes (length: number): Uint8Array {
  // $FlowIssue crypto support: https://github.com/facebook/flow/issues/5019
  return crypto.getRandomValues(new Uint8Array(length))
}

export function randomHexString (length: number): string {
  return Array.from(randomBytes(length), byte => (byte % 16).toString(16)).join('')
}

export function randomIntFromRange (min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function randomFromArray (arr: any[]): any {
  return arr[Math.floor(Math.random() * arr.length)]
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
  // $FlowFixMe
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
  // $FlowFixMe
  return uniq([].concat.apply([], arrays))
}

export function intersection (a1: any[], ...arrays: any[][]): any[] {
  return uniq(a1).filter(v1 => arrays.every(v2 => v2.indexOf(v1) >= 0))
}

export function difference (a1: any[], ...arrays: any[][]): any[] {
  // $FlowFixMe
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

/**
 * Modified version of: https://github.com/component/debounce/blob/master/index.js
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing. The function also has a property 'clear'
 * that is a function which will clear the timer to prevent previously scheduled executions.
 *
 * @source underscore.js
 * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
 * @param {Function} function to wrap
 * @param {Number} timeout in ms (`100`)
 * @param {Boolean} whether to execute at the beginning (`false`)
 * @api public
 */
export function debounce (func: Function, wait: number, immediate: ?boolean): Function {
  let timeout, args, context, timestamp, result
  if (wait == null) wait = 100

  function later () {
    const last = Date.now() - timestamp

    if (last < wait && last >= 0) {
      timeout = setTimeout(later, wait - last)
    } else {
      timeout = null
      if (!immediate) {
        result = func.apply(context, args)
        context = args = null
      }
    }
  }

  const debounced = function () {
    context = this
    args = arguments
    timestamp = Date.now()
    const callNow = immediate && !timeout
    if (!timeout) timeout = setTimeout(later, wait)
    if (callNow) {
      result = func.apply(context, args)
      context = args = null
    }

    return result
  }

  debounced.clear = function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
  }

  debounced.flush = function () {
    if (timeout) {
      result = func.apply(context, args)
      context = args = null
      clearTimeout(timeout)
      timeout = null
    }
  }

  return debounced
}
