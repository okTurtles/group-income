/* eslint-env mocha */
import assert from 'node:assert/strict'
import sbp from '@sbp/sbp'
import { connectionStatus } from '../../test/unit-helpers/connectionStatus.js'
import { fakeTimers, settle, silenceConsole } from '../../test/unit-helpers/utils.js'
import {
  CONNECTION_STATUS_TIMEOUT,
  isStatusUnavailableError,
  requestConnectionStatus
} from './connectionStatus.js'

const SELECTOR = 'sw/connection/status'

// `callWithTimeout` itself is tested in `utils/timers.test.js`: these tests
// cover what `requestConnectionStatus` adds, i.e., its defaults
let clock

describe('connection status request', () => {
  beforeEach(() => { clock = fakeTimers() })
  afterEach(() => { clock.restore() })

  describe('requestConnectionStatus', () => {
    describe('without getStatus', () => {
      // SBP warns when an unsafe selector is registered
      silenceConsole(['warn'])
      // Only unsafe selectors can be unregistered. No other test file
      // registers this one, and the tab's `sw/*` route isn't loaded here.
      before(() => { sbp('sbp/selectors/unsafe', [SELECTOR]) })
      afterEach(() => { sbp('sbp/selectors/unregister', [SELECTOR]) })
      after(() => { sbp('sbp/selectors/lock', [SELECTOR]) })

      it('queries sw/connection/status', async () => {
        const status = connectionStatus('open', { at: clock.now })
        let calls = 0
        sbp('sbp/selectors/register', { [SELECTOR]: () => { calls++; return Promise.resolve(status) } })
        assert.equal(await requestConnectionStatus(), status)
        assert.equal(calls, 1)
        assert.equal(clock.countTimers(), 0)
      })

      it('rejects as from an older service worker while the selector is missing', async () => {
        await assert.rejects(requestConnectionStatus(), (e) => isStatusUnavailableError(e))
        assert.equal(clock.countTimers(), 0)
      })
    })

    it('times out with the shared message, after CONNECTION_STATUS_TIMEOUT by default', async () => {
      let error = null
      requestConnectionStatus({ getStatus: () => new Promise(() => {}) }).catch((e) => { error = e })
      clock.tick(CONNECTION_STATUS_TIMEOUT - 1)
      await settle()
      assert.equal(error, null)
      clock.tick(1)
      await settle()
      assert.equal(error?.message, 'Timed out getting the connection status')
      assert.equal(clock.countTimers(), 0)
    })

    it('uses the given timeout', async () => {
      let error = null
      requestConnectionStatus({ getStatus: () => new Promise(() => {}), timeout: 1000 }).catch((e) => { error = e })
      clock.tick(999)
      await settle()
      assert.equal(error, null)
      clock.tick(1)
      await settle()
      assert.equal(error?.message, 'Timed out getting the connection status')
      assert.equal(clock.countTimers(), 0)
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
        new Error('SBP: selector not registered: state/vuex/getters'),
        new Error('SBP: selector not registered: sw/connection/status2'),
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
