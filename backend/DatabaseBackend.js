const requiredMethodNames = ['init', 'clear', 'readData', 'writeData', 'deleteData']

export default class DatabaseBackend {
  constructor () {
    // $FlowFixMe[unsupported-syntax]
    if (new.target === DatabaseBackend) {
      throw new Error('Class DatabaseBackend cannot be instantiated directly.')
    }
    // Check required methods.
    // Also rebind them to the instance so as to make them usable with destructuring.
    for (const name of requiredMethodNames) {
      // $FlowFixMe[prop-missing]
      if (typeof this[name] !== 'function') {
        throw new Error(`Class ${this.constructor.name} must implement method '${name}'`)
      }
      // $FlowFixMe[prop-missing]
      this[name] = this[name].bind(this)
    }
  }
}
