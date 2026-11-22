/* eslint-env mocha */
import assert from 'node:assert/strict'
import sbp from '@sbp/sbp'
import { connectionStatus } from '../../test/unit-helpers/connectionStatus.js'
import { fakeTimers, settle, silenceConsole } from '../../test/unit-helpers/utils.js'
import {
  CONNECTION_STATUS_TIMEOUT,
  isRestartUnavailableError,
  isStatusUnavailableError,
  requestConnectionRestart,
  requestConnectionStatus,
  restartConnectionInBackground
} from './connectionStatus.js'

const SELECTOR = 'sw/connection/status'
const RESTART_SELECTOR = 'sw/connection/restart'

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

  describe('requestConnectionRestart', () => {
    describe('without restart', () => {
      // As for `requestConnectionStatus`, above
      silenceConsole(['warn'])
      before(() => { sbp('sbp/selectors/unsafe', [RESTART_SELECTOR]) })
      afterEach(() => { sbp('sbp/selectors/unregister', [RESTART_SELECTOR]) })
      after(() => { sbp('sbp/selectors/lock', [RESTART_SELECTOR]) })

      it('calls sw/connection/restart with the reason', async () => {
        const reasons = []
        sbp('sbp/selectors/register', { [RESTART_SELECTOR]: (reason) => { reasons.push(reason); return Promise.resolve('reconnecting') } })
        assert.equal(await requestConnectionRestart('retry-button'), 'reconnecting')
        assert.deepEqual(reasons, ['retry-button'])
        assert.equal(clock.countTimers(), 0)
      })

      it('rejects as from an older service worker while the selector is missing', async () => {
        await assert.rejects(requestConnectionRestart('retry-button'), (e) => isRestartUnavailableError(e))
        assert.equal(clock.countTimers(), 0)
      })
    })

    it('times out after CONNECTION_STATUS_TIMEOUT by default, or the given timeout', async () => {
      for (const [timeout, options] of [[CONNECTION_STATUS_TIMEOUT, {}], [1000, { timeout: 1000 }]]) {
        let error = null
        requestConnectionRestart('tab-visible', { restart: () => new Promise(() => {}), ...options }).catch((e) => { error = e })
        clock.tick(timeout - 1)
        await settle()
        assert.equal(error, null)
        clock.tick(1)
        await settle()
        assert.equal(error?.message, 'Timed out restarting the connection')
        assert.equal(clock.countTimers(), 0)
      }
    })
  })

  describe('isRestartUnavailableError', () => {
    it('recognizes the rejection of a service worker older than the selector', () => {
      assert.equal(isRestartUnavailableError(new Error('SBP: selector not registered: sw/connection/restart')), true)
    })

    it('is false for anything else', () => {
      for (const value of [
        new Error('Timed out restarting the connection'),
        new Error('SBP: selector not registered: sw/connection/status'),
        new Error('SBP: selector not registered: sw/connection/restart2'),
        new Error('Error: SBP: selector not registered: sw/connection/restart'),
        'SBP: selector not registered: sw/connection/restart',
        null,
        undefined
      ]) {
        assert.equal(isRestartUnavailableError(value), false, String(value?.message ?? value))
      }
    })
  })

  // The tab-visible restart, in main.js
  describe('restartConnectionInBackground', () => {
    const logs = silenceConsole(['warn'])
    const restart = (result) => () => result

    it('ignores, without logging, the rejection of a service worker older than the selector', async () => {
      const answer = await restartConnectionInBackground('tab-visible', {
        restart: restart(Promise.reject(new Error('SBP: selector not registered: sw/connection/restart')))
      })
      assert.equal(answer, undefined)
      assert.deepEqual(logs, [])
    })

    it('logs other failures and timeouts, and never rejects', async () => {
      await restartConnectionInBackground('tab-visible', { restart: restart(Promise.reject(new Error('SW controller changed'))) })
      await restartConnectionInBackground('tab-visible', { restart: () => { throw new Error('thrown') } })
      const late = restartConnectionInBackground('tab-visible', { restart: restart(new Promise(() => {})), timeout: 1000 })
      clock.tick(1000)
      await late
      assert.deepEqual(logs.map(({ args }) => [args[0], args[1]?.message]), [
        ['[connection] Could not restart the reconnection cycle (tab-visible)', 'SW controller changed'],
        ['[connection] Could not restart the reconnection cycle (tab-visible)', 'thrown'],
        ['[connection] Could not restart the reconnection cycle (tab-visible)', 'Timed out restarting the connection']
      ])
    })

    it('resolves once the service worker answers', async () => {
      let calls = 0
      await restartConnectionInBackground('tab-visible', { restart: () => { calls++; return Promise.resolve('nothing-to-do') } })
      assert.equal(calls, 1)
      assert.deepEqual(logs, [])
    })
  })
})
