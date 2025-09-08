export interface IDatabaseBackend {
  init (): Promise<void>;
  clear (): Promise<void>;
  readData (key: string): Promise<Buffer | string | void>;
  writeData (key: string, value: Buffer | string): Promise<void>;
  deleteData (key: string): Promise<void>;
  close (): Promise<void> | void;
}

const requiredMethodNames = ['init', 'clear', 'readData', 'writeData', 'deleteData', 'close']

export default class DatabaseBackend {
  constructor () {
    // $FlowFixMe[unsupported-syntax]
    if (new.target === DatabaseBackend) {
      throw new Error('Class DatabaseBackend cannot be instantiated directly.')
    }
    // Also rebind them to the instance so as to make them usable with destructuring.
    for (const name of requiredMethodNames) {
      // $FlowFixMe[prop-missing]
      this[name] = this[name].bind(this)
    }
  }
}
