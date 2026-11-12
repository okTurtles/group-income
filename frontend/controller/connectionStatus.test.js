/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../test/unit-helpers/fakeClock.js'
import { connectionStatus } from '../../test/unit-helpers/connectionStatus.js'
import { settle } from '../../test/unit-helpers/utils.js'
import {
  CONNECTION_STATUS_TIMEOUT,
  isStatusUnavailableError,
  requestConnectionStatus
} from './connectionStatus.js'

describe('connection status request', () => {
  describe('requestConnectionStatus', () => {
    it("passes getStatus's answer through", async () => {
      const clock = fakeClock()
      const status = connectionStatus('open', { at: clock.now() })
      assert.equal(await requestConnectionStatus({ getStatus: () => Promise.resolve(status), timers: clock.timers }), status)
      assert.equal(clock.pendingTimers(), 0)
    })

    it("passes getStatus's rejection through", async () => {
      const clock = fakeClock()
      const error = new Error('SBP: selector not registered: sw/connection/status')
      await assert.rejects(requestConnectionStatus({ getStatus: () => Promise.reject(error), timers: clock.timers }), (e) => e === error)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('times out with the shared message, after CONNECTION_STATUS_TIMEOUT by default', async () => {
      const clock = fakeClock()
      let error = null
      requestConnectionStatus({ getStatus: () => new Promise(() => {}), timers: clock.timers }).catch((e) => { error = e })
      clock.advance(CONNECTION_STATUS_TIMEOUT - 1)
      await settle()
      assert.equal(error, null)
      clock.advance(1)
      await settle()
      assert.equal(error?.message, 'Timed out getting the connection status')
    })

    it('uses the given timeout', async () => {
      const clock = fakeClock()
      let error = null
      requestConnectionStatus({ getStatus: () => new Promise(() => {}), timeout: 1000, timers: clock.timers }).catch((e) => { error = e })
      clock.advance(999)
      await settle()
      assert.equal(error, null)
      clock.advance(1)
      await settle()
      assert.equal(error?.message, 'Timed out getting the connection status')
    })
  })

  describe('isStatusUnavailableError', () => {
    it('recognizes the rejection of a service worker older than the selector', () => {
      assert.equal(isStatusUnavailableError(new Error('SBP: selector not registered: sw/connection/status')), true)
    })

    it('is false for anything else', () => {
      for (const value of [
        new Error('Timed out getting the connection status'),
        new Error('boom'),
        new Error('Error: SBP: selector not registered: sw/connection/status'),
        { message: 42 },
        'SBP: selector not registered: sw/connection/status',
        null,
        undefined
      ]) {
        assert.equal(isStatusUnavailableError(value), false, String(value?.message ?? value))
      }
    })
  })
})
