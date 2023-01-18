export function cloneDeep (obj: Object): any {
  return JSON.parse(JSON.stringify(obj))
}
