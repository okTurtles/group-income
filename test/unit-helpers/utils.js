/* eslint-env mocha */

// A promise with its `resolve` and `reject` functions
export const deferred = () => {
  const handlers = {}
  const promise = new Promise((resolve, reject) => { Object.assign(handlers, { resolve, reject }) })
  return { promise, ...handlers }
}

// Lets the promise callbacks run
export const settle = () => new Promise(resolve => setImmediate(resolve))

// Captures the console output of each test of the enclosing `describe` block
// instead of printing it. Returns the captured entries (`{ level, args }`),
// emptied before each test.
export const silenceConsole = (levels = ['info', 'warn', 'error']) => {
  const logs = []
  const original = {}
  beforeEach(() => {
    logs.length = 0
    for (const level of levels) {
      original[level] = console[level]
      console[level] = (...args) => { logs.push({ level, args }) }
    }
  })
  afterEach(() => {
    Object.assign(console, original)
  })
  return logs
}
