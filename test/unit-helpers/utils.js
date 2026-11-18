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
// (nested blocks included) instead of printing it. Returns the captured
// entries (`{ level, args }`), emptied before each test. The output of a test
// that fails, or whose `beforeEach` hook fails, is printed after it, since it
// may explain the failure. So is a failed attempt that Mocha retries, even if
// the retry passes: it may explain a flaky test.
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
  // Not an arrow function: Mocha passes the test as `this.currentTest`. Its
  // state is unset when a `beforeEach` hook failed, and for an attempt that
  // Mocha retries.
  afterEach(function () {
    Object.assign(console, original)
    const state = this.currentTest?.state
    if (state !== 'passed' && state !== 'pending') {
      for (const { level, args } of logs) console[level](...args)
    }
  })
  return logs
}
