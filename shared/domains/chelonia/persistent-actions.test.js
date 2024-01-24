/* eslint-env mocha */

// Can run directly with:
// ./node_modules/.bin/mocha --require Gruntfile.js --require @babel/register shared/domains/chelonia/persistent-actions.test.js

// FIXME: `Error: unsafe must be called before registering selector` when Mocha reloads the file.

import assert from 'node:assert'
import crypto from 'node:crypto'
import sbp from '@sbp/sbp'
import sinon from 'sinon'

import '~/shared/domains/chelonia/db.js'

import './persistent-actions.js'
import { PERSISTENT_ACTION_FAILURE, PERSISTENT_ACTION_TOTAL_FAILURE, PERSISTENT_ACTION_SUCCESS } from './events.js'

// Provides the 'crypto' global in the Nodejs environment.
if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', { value: crypto })
}
// Necessary to avoid 'JSON.stringify' errors since Node timeouts are circular objects, whereas browser timeouts are just integers.
setTimeout(() => {}).constructor.prototype.toJSON = () => undefined

sbp('sbp/selectors/register', {
  call (fn, ...args) {
    return fn(...args)
  },
  log (msg) {
    console.log(msg)
  },
  rejectAfter100ms (arg) {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(arg), 100)
    })
  },
  resolveAfter100ms (arg) {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve(arg), 100)
    })
  },
  returnImmediately (arg) {
    return arg
  },
  throwImmediately (arg) {
    throw arg
  }
})

const createRandomError = () => new Error(`Bad number: ${String(Math.random())}`)
const getActionStatus = (id) => sbp('chelonia.persistentActions/status').find(obj => obj.id === id)
const isActionRemoved = (id) => !sbp('chelonia.persistentActions/status').find(obj => obj.id === id)

const spies = {
  returnImmediately: sinon.spy(sbp('sbp/selectors/fn', 'returnImmediately'))
}
// Custom `configure` options for tests.
// Mocha has a default 2000ms test timeout, therefore we'll use short delays.
const testOptions = {
  maxAttempts: 3,
  retrySeconds: 0.5
}

describe('Test persistent actions', function () {
  it('should configure', function () {
    sbp('chelonia.persistentActions/configure', {
      databaseKey: 'test-key',
      options: testOptions
    })
  })

  it('should enqueue without immediately attempting', function () {
    // Prepare actions to enqueue. Random numbers are used to make invocations different.
    const args = [
      // Basic syntax.
      ['returnImmediately', Math.random()],
      // Minimal option syntax.
      {
        invocation: ['returnImmediately', Math.random()]
      },
      // Full option syntax.
      {
        errorInvocation: ['log', 'Action n°3 failed'],
        invocation: ['returnImmediately', Math.random()],
        maxAttempts: 4,
        retrySeconds: 5,
        skipCondition: ['test'],
        totalFailureInvocation: ['log', 'Action n°3 totally failed']
      }
    ]
    const ids = sbp('chelonia.persistentActions/enqueue', ...args)
    assert(Array.isArray(ids))
    assert(ids.length === args.length)
    // Check the actions have been correctly queued.
    ids.forEach((id, index) => {
      const arg = args[index]
      const status = getActionStatus(id)
      assert.strictEqual(status.id, id)
      assert.deepEqual(status.invocation, arg.invocation ?? arg)
      assert.strictEqual(status.attempting, false)
      assert.strictEqual(status.failedAttemptsSoFar, 0)
      assert.strictEqual(status.lastError, '')
      assert.strictEqual(status.nextRetry, '')
      assert.strictEqual(status.resolved, false)
    })
    // Check the actions have NOT been tried yet.
    assert.strictEqual(spies.returnImmediately.called, false)
  })

  it('should emit a success event and remove the action', function () {
    // Prepare actions using both sync and async invocations.
    // TODO: maybe the async case is enough, which would make the code simpler.
    const randomNumbers = [Math.random(), Math.random()]
    const invocations = [
      ['resolveAfter100ms', randomNumbers[0]],
      ['returnImmediately', randomNumbers[1]]
    ]
    const ids = sbp('chelonia.persistentActions/enqueue', ...invocations)
    return Promise.all(ids.map((id, index) => new Promise((resolve, reject) => {
      // Registers a success handler for each received id.
      sbp('okTurtles.events/on', PERSISTENT_ACTION_SUCCESS, function handler (details) {
        if (details.id !== id) return
        try {
          // Check the action has actually been called and its result is correct.
          assert.strictEqual(details.result, randomNumbers[index])
          // Check the action has been correctly removed.
          assert(isActionRemoved(id))
          // Wait a little to make sure the action isn't going to be retried.
          setTimeout(resolve, (testOptions.retrySeconds + 1) * 1e3)
        } catch (err) {
          reject(err)
        } finally {
          sbp('okTurtles.events/off', PERSISTENT_ACTION_SUCCESS, handler)
        }
      })
    })))
  })

  it('should emit a failure event and schedule a retry', function () {
    const ourError = createRandomError()
    const invocation = ['rejectAfter100ms', ourError]
    const [id] = sbp('chelonia.persistentActions/enqueue', invocation)
    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', PERSISTENT_ACTION_FAILURE, (details) => {
        try {
          assert.strictEqual(details.id, id)
          assert.strictEqual(details.error, ourError)
          // Check the action status.
          const status = getActionStatus(id)
          assert.strictEqual(status.failedAttemptsSoFar, 1)
          assert.strictEqual(status.lastError, ourError.message)
          assert.strictEqual(status.resolved, false)
          // Check a retry has been scheduled.
          assert(new Date(status.nextRetry) - Date.now() <= testOptions.retrySeconds * 1e3)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  it('should emit N failure events, then a total failure event and remove the action (sync)', function () {
    const ourError = createRandomError()
    const invocation = ['throwImmediately', ourError]
    return e2eFailureTest(invocation, ourError)
  })

  it('should emit N failure events, then a total failure event and remove the action (async)', function () {
    const ourError = createRandomError()
    const invocation = ['rejectAfter100ms', ourError]
    return e2eFailureTest(invocation, ourError)
  })

  it('should handle non-Error failures gracefully', function () {
    const ourError = 'not a real error'
    const invocation = ['rejectAfter100ms', ourError]
    return e2eFailureTest(invocation, ourError)
  })

  function e2eFailureTest (invocation, ourError) {
    const errorInvocationSpy = sinon.spy()
    const errorInvocation = ['call', errorInvocationSpy]

    const [id] = sbp('chelonia.persistentActions/enqueue', { invocation, errorInvocation })

    return new Promise((resolve, reject) => {
      let failureEventCounter = 0
      sbp('okTurtles.events/on', PERSISTENT_ACTION_FAILURE, (details) => {
        if (details.id !== id) return
        failureEventCounter++
        try {
          assert(failureEventCounter <= testOptions.maxAttempts, 1)
          // Check the event handler was called before the corresponding SBP invocation.
          assert.strictEqual(failureEventCounter, errorInvocationSpy.callCount + 1, 2)
          assert.strictEqual(details.error.message, ourError?.message ?? ourError, 3)
        } catch (err) {
          reject(err)
        }
      })
      sbp('okTurtles.events/on', PERSISTENT_ACTION_TOTAL_FAILURE, (details) => {
        if (details.id !== id) return
        try {
          assert.strictEqual(failureEventCounter, testOptions.maxAttempts, 3)
          assert.strictEqual(errorInvocationSpy.callCount, testOptions.maxAttempts, 4)
          assert.strictEqual(details.error.message, ourError?.message ?? ourError, 5)
          assert(isActionRemoved(id), 6)
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  it('should cancel and remove the given action', function () {
    return new Promise((resolve, reject) => {
      // This action will reject the promise and fail the test if it ever gets tried.
      const [id] = sbp('chelonia.persistentActions/enqueue', ['call', reject])
      sbp('chelonia.persistentActions/cancel', id)
      assert(isActionRemoved(id))
      // Wait half a second to be sure the action isn't going to be tried despite being removed.
      setTimeout(resolve, 500)
    })
  })
})
