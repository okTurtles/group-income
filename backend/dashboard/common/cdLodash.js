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
