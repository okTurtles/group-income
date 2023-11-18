/* eslint-env mocha */

// Can run directly with:
// ./node_modules/.bin/mocha -w --require Gruntfile.js --require @babel/register shared/domains/chelonia/persistent-actions.test.js

// FIXME: `Error: unsafe must be called before registering selector` when Mocha reloads the file.

import assert from 'node:assert'
import crypto from 'node:crypto'
import sbp from '@sbp/sbp'
import sinon from 'sinon'

import '~/shared/domains/chelonia/db.js'

import './persistent-actions.js'
import { PERSISTENT_ACTION_FAILURE, PERSISTENT_ACTION_TOTAL_FAILURE, PERSISTENT_ACTION_SUCCESS } from './events.js'

// Provides the 'crypto' global in the Nodejs environment.
globalThis.crypto = crypto
// Necessary to avoid 'JSON.stringify' errors since Node timeouts are circular objects, whereas browser timeouts are just integers.
setTimeout(() => {}).constructor.prototype.toJSON = () => undefined

sbp('sbp/selectors/register', {
  call (fn, ...args) {
    fn(...args)
  },
  returnImmediately (arg) {
    return arg
  },
  throwImmediately (arg) {
    throw arg
  },
  log (msg) {
    console.log(msg)
  },
  rejectsAfterFiveSeconds (...args) {
    return new Promise((resolve, reject) => {
      setTimeout(reject, 5e3)
    })
  },
  resolveAfterFiveSeconds (...args) {
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 5e3)
    })
  }
})

const createRandomError = () => new Error(`Bad number: ${String(Math.random())}`)
const getActionStatus = (id) => sbp('chelonia.persistentActions/status').find(obj => obj.id === id)
const isActionRemoved = (id) => !sbp('chelonia.persistentActions/status').find(obj => obj.id === id)

const spies = {
  returnImmediately: sinon.spy(sbp('sbp/selectors/fn', 'returnImmediately'))
}
// Custom `configure` options for tests.
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

  it('should enqueue', function () {
    const invocation = ['returnImmediately', Math.random()]
    const ids = sbp('chelonia.persistentActions/enqueue', invocation)
    assert.strictEqual(ids.length, 1)
    // Check the action was correctly queued.
    const statuses = sbp('chelonia.persistentActions/status')
    assert.strictEqual(statuses.length, 1)
    const [status] = statuses
    assert.strictEqual(status.id, ids[0])
    assert.deepEqual(status.invocation, invocation)
    assert.strictEqual(status.attempting, false)
    assert.strictEqual(status.failedAttemptsSoFar, 0)
    assert.strictEqual(status.lastError, '')
    assert.strictEqual(status.nextRetry, '')
    assert.strictEqual(status.resolved, false)
    // Check the action's invocation was NOT called yet.
    assert.strictEqual(spies.returnImmediately.called, false)
  })

  it('should emit a success event and remove the action', function () {
    const randomNumber = Math.random()
    const invocation = ['returnImmediately', randomNumber]
    const [id] = sbp('chelonia.persistentActions/enqueue', invocation)
    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/once', PERSISTENT_ACTION_SUCCESS, (details) => {
        try {
          assert.strictEqual(details.id, id)
          assert.strictEqual(details.result, randomNumber)
          // Check the action was correctly removed.
          assert(isActionRemoved(id))
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  it('should emit a failure event and schedule a retry', function () {
    const ourError = createRandomError()
    const invocation = ['throwImmediately', ourError]
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

  it('should emit a total failure event and remove the action', function () {
    const counter = sinon.spy()
    const ourError = createRandomError()
    const invocation = ['throwImmediately', ourError]
    const [id] = sbp('chelonia.persistentActions/enqueue', {
      invocation,
      errorInvocation: ['call', counter]
    })
    return new Promise((resolve, reject) => {
      sbp('okTurtles.events/on', PERSISTENT_ACTION_TOTAL_FAILURE, (details) => {
        if (details.id !== id) return
        try {
          assert.strictEqual(counter.callCount, testOptions.maxAttempts)
          assert.strictEqual(details.error, ourError)
          assert(isActionRemoved(id))
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    })
  })

  it('should call the given total failure invocation', function () {
    return new Promise((resolve) => {
      sbp('chelonia.persistentActions/enqueue', {
        invocation: ['throwImmediately', createRandomError()],
        totalFailureInvocation: ['call', resolve]
      })
    })
  })
})

/*
const get = () => sbp('chelonia/db/get', `chelonia/persistentActions/${sbp('state/vuex/getters').ourIdentityContractId}`)
const set = (value) => sbp('chelonia/db/set', `chelonia/persistentActions/${sbp('state/vuex/getters').ourIdentityContractId}`, value)
*/
