const methodNames = ['init', 'clear', 'readData', 'writeData', 'deleteData']

// Rebind public methods of the given DB wrapper to make them usable with destructuring.
export function rebindMethods (object: Object): void {
  for (const name of methodNames) {
    object[name] = object[name].bind(object)
  }
}
