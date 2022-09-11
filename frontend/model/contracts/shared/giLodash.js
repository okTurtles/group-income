// manually implemented lodash functions are better than even:
// https://github.com/lodash/babel-plugin-lodash
// additional tiny versions of lodash functions are available in VueScript2

export function mapValues (obj, fn, o = {}) {
  for (const key in obj) { o[key] = fn(obj[key]) }
  return o
}

export function mapObject (obj, fn) {
  return Object.fromEntries(Object.entries(obj).map(fn))
}

export function pick (o, props) {
  const x = {}
  for (const k of props) { x[k] = o[k] }
  return x
}

export function pickWhere (o, where) {
  const x = {}
  for (const k in o) {
    if (where(o[k])) { x[k] = o[k] }
  }
  return x
}

export function choose (array, indices) {
  const x = []
  for (const idx of indices) { x.push(array[idx]) }
  return x
}

export function omit (o, props) {
  const x = {}
  for (const k in o) {
    if (!props.includes(k)) {
      x[k] = o[k]
    }
  }
  return x
}

export function cloneDeep (obj) {
  return JSON.parse(JSON.stringify(obj))
}

function isMergeableObject (val) {
  const nonNullObject = val && typeof val === 'object'
  // $FlowFixMe
  return nonNullObject && Object.prototype.toString.call(val) !== '[object RegExp]' && Object.prototype.toString.call(val) !== '[object Date]'
}

export function merge (obj, src) {
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

export function delay (msec) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, msec)
  })
}

export function randomBytes (length) {
  // $FlowIssue crypto support: https://github.com/facebook/flow/issues/5019
  return crypto.getRandomValues(new Uint8Array(length))
}

export function randomHexString (length) {
  return Array.from(randomBytes(length), byte => (byte % 16).toString(16)).join('')
}

export function randomIntFromRange (min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

export function randomFromArray (arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function flatten (arr) {
  let flat = []
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

export function uniq (array) {
  return Array.from(new Set(array))
}

export function union (...arrays) {
  // $FlowFixMe
  return uniq([].concat.apply([], arrays))
}

export function intersection (a1, ...arrays) {
  return uniq(a1).filter(v1 => arrays.every(v2 => v2.indexOf(v1) >= 0))
}

export function difference (a1, ...arrays) {
  // $FlowFixMe
  const a2 = [].concat.apply([], arrays)
  return a1.filter(v => a2.indexOf(v) === -1)
}

export function deepEqualJSONType (a, b) {
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
export function debounce (func, wait, immediate) {
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
