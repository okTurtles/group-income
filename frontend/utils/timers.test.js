/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../test/unit-helpers/fakeClock.js'
import { deferred, settle } from '../../test/unit-helpers/utils.js'
import { callWithTimeout } from './timers.js'

const MESSAGE = 'Timed out doing it'
const MS = 1000

// Records how `promise` settles, without awaiting it
const track = (promise) => {
  const result = { settled: false }
  promise.then(
    (value) => Object.assign(result, { settled: true, value }),
    (error) => Object.assign(result, { settled: true, error })
  )
  return result
}

describe('timers', () => {
  describe('callWithTimeout', () => {
    it('resolves with the value of a sync fn', async () => {
      const clock = fakeClock()
      assert.equal(await callWithTimeout(() => 42, MS, MESSAGE, clock.timers), 42)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('resolves with the value of an async fn', async () => {
      const clock = fakeClock()
      assert.equal(await callWithTimeout(() => Promise.resolve('ok'), MS, MESSAGE, clock.timers), 'ok')
      assert.equal(clock.pendingTimers(), 0)
    })

    it("rejects with the error of fn's promise", async () => {
      const clock = fakeClock()
      const error = new Error('rejected')
      await assert.rejects(callWithTimeout(() => Promise.reject(error), MS, MESSAGE, clock.timers), (e) => e === error)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('rejects with the error fn throws', async () => {
      const clock = fakeClock()
      const error = new Error('thrown')
      await assert.rejects(callWithTimeout(() => { throw error }, MS, MESSAGE, clock.timers), (e) => e === error)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('rejects with the message after exactly ms', async () => {
      const clock = fakeClock()
      const result = track(callWithTimeout(() => new Promise(() => {}), MS, MESSAGE, clock.timers))
      await settle()
      clock.advance(MS - 1)
      await settle()
      assert.equal(result.settled, false)
      clock.advance(1)
      await settle()
      assert.equal(result.settled, true)
      assert.ok(result.error instanceof Error)
      assert.equal(result.error.message, MESSAGE)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('ignores an answer that comes after the timeout', async () => {
      const clock = fakeClock()
      const answer = deferred()
      const result = track(callWithTimeout(() => answer.promise, MS, MESSAGE, clock.timers))
      clock.advance(MS)
      await settle()
      answer.resolve('late')
      await settle()
      assert.equal(result.error?.message, MESSAGE)
      assert.equal(result.value, undefined)
    })

    it('calls fn synchronously', () => {
      const clock = fakeClock()
      let calls = 0
      callWithTimeout(() => { calls++ }, MS, MESSAGE, clock.timers)
      assert.equal(calls, 1)
    })

    it('leaves no pending timer once settled either way', async () => {
      const clock = fakeClock()
      const answer = deferred()
      const failure = deferred()
      const resolved = track(callWithTimeout(() => answer.promise, MS, MESSAGE, clock.timers))
      const rejected = track(callWithTimeout(() => failure.promise, MS, MESSAGE, clock.timers))
      assert.equal(clock.pendingTimers(), 2)
      answer.resolve('done')
      await settle()
      assert.deepEqual(resolved, { settled: true, value: 'done' })
      assert.equal(clock.pendingTimers(), 1)
      failure.reject(new Error('failed'))
      await settle()
      assert.equal(rejected.error?.message, 'failed')
      assert.equal(clock.pendingTimers(), 0)
    })
  })
})
