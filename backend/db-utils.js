// Rebind public methods of the given DB wrapper to make them usable with destructuring.
export function rebindMethods (object: Object, methodNames: string[]): void {
  for (const name of methodNames) {
    object[name] = object[name].bind(object)
  }
}
