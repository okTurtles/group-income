/* eslint-env mocha */

import { retry } from './retry.js'
const should = require('should')

describe('retry', () => {
  const failing = (times, result = 'ok') => {
    const calls = []
    const fn = (attempt) => {
      calls.push(attempt)
      return calls.length <= times ? Promise.reject(new Error(`failure ${calls.length}`)) : Promise.resolve(result)
    }
    return { fn, calls }
  }

  it('resolves with the result of the first attempt if it succeeds, without retrying', async () => {
    const { fn, calls } = failing(0)
    const retried = []
    should(await retry(fn, { attempts: 2, delayMs: 0, onRetry: (e) => retried.push(e) })).equal('ok')
    should(calls).eql([1])
    should(retried).eql([])
  })

  it('tries again after a failure', async () => {
    const { fn, calls } = failing(1)
    const retried = []
    should(await retry(fn, { attempts: 2, delayMs: 0, onRetry: (e, attempt) => retried.push([e.message, attempt]) })).equal('ok')
    should(calls).eql([1, 2])
    should(retried).eql([['failure 1', 1]])
  })

  it('rejects with the error of the last attempt once there are no attempts left', async () => {
    const { fn, calls } = failing(5)
    const retried = []
    await should(retry(fn, { attempts: 3, delayMs: 0, onRetry: (e) => retried.push(e.message) })).be.rejectedWith('failure 3')
    should(calls).eql([1, 2, 3])
    should(retried).eql(['failure 1', 'failure 2'])
  })

  // `onRetry` is meant for logging
  it('keeps trying, and rejects with the error of the last attempt, if onRetry throws', async () => {
    const { fn, calls } = failing(5)
    const consoleError = console.error
    const logged = []
    console.error = (...args) => logged.push(args)
    try {
      await should(retry(fn, { attempts: 3, delayMs: 0, onRetry: () => { throw new Error('hook error') } })).be.rejectedWith('failure 3')
    } finally {
      console.error = consoleError
    }
    should(calls).eql([1, 2, 3])
    should(logged.map(([, e]) => e.message)).eql(['hook error', 'hook error'])
  })

  it('makes a single attempt if only one is allowed', async () => {
    const { fn, calls } = failing(1)
    await should(retry(fn, { attempts: 1, delayMs: 0 })).be.rejectedWith('failure 1')
    should(calls).eql([1])
  })

  it('waits between attempts', async () => {
    const { fn } = failing(1)
    const start = Date.now()
    await retry(fn, { attempts: 2, delayMs: 50 })
    should(Date.now() - start).be.aboveOrEqual(45)
  })
})
