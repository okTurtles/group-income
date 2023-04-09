export function cloneDeep (obj: Object): any {
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

export function throttle (func: Function, delay: number): Function {
  // reference: https://www.geeksforgeeks.org/javascript-throttling/

  // Previously called time of the function
  let prev = 0
  return (...args) => {
    // Current called time of the function
    const now = new Date().getTime()

    // If difference is greater than delay call
    if (now - prev > delay) {
      prev = now

      return func(...args)
    }
  }
}

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
