/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../test/unit-helpers/fakeClock.js'
import { connectionStatus } from '../../test/unit-helpers/connectionStatus.js'
import { deferred, settle, silenceConsole } from '../../test/unit-helpers/utils.js'
import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../utils/events.js'
import {
  CONNECTION_BANNER,
  CONNECTION_BANNER_GRACE,
  CONNECTION_BANNER_REFRESH_INTERVAL,
  bannerForStatus,
  createConnectionBannerController
} from './connectionBanner.js'
import { CONNECTION_STATUS_TIMEOUT } from './connectionStatus.js'

const GRACE = CONNECTION_BANNER_GRACE
const REFRESH = CONNECTION_BANNER_REFRESH_INTERVAL

// A status from `sw/connection/status` (see `ConnectionStatus`)
const status = (state, { at, since = at, degraded = false } = {}) =>
  connectionStatus(state, { at, since, wanted: 2, degraded })

const NOT_REGISTERED = 'SBP: selector not registered: sw/connection/status'

// `answer(now)` is what `getStatus()` returns (a status, a promise, or it
// throws)
const harness = ({ answer, online = true, ...options } = {}) => {
  const clock = fakeClock()
  const env = { answer, online, calls: 0, changes: [] }
  const controller = createConnectionBannerController({
    getStatus: () => {
      env.calls++
      return env.answer(clock.now())
    },
    onChange: (kind) => { env.changes.push(kind) },
    isOnline: () => env.online,
    now: clock.now,
    timers: clock.timers,
    ...options
  })
  const start = async () => {
    controller.start()
    await settle()
  }
  // A status as computed by the service worker now
  const current = (state, { sinceAgo = 0, degraded = false } = {}) =>
    status(state, { at: clock.now(), since: clock.now() - sinceAgo, degraded })
  return { clock, env, controller, start, current }
}

const answering = (state, options) => (now) => Promise.resolve(status(state, { at: now, ...options }))
const rejecting = (message = NOT_REGISTERED) => () => Promise.reject(new Error(message))

describe('connection banner', () => {
  const logs = silenceConsole()
  const count = (level) => logs.filter(log => log.level === level).length

  describe('bannerForStatus', () => {
    const now = 1_000_000
    const at = (state, sinceAgo, options) => status(state, { at: now, since: sinceAgo === null ? null : now - sinceAgo, ...options })

    it('maps each connection state to a banner', () => {
      const cases = [
        [at('open', 60e3), null, null],
        [at('open', 60e3, { degraded: true }), null, CONNECTION_BANNER.DEGRADED],
        [at('offline', 0), null, CONNECTION_BANNER.OFFLINE],
        [at('reconnecting', 0), null, CONNECTION_BANNER.RECONNECTING],
        [at('reconnecting', 0), CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING],
        [at('connecting', GRACE), null, CONNECTION_BANNER.RECONNECTING],
        [at('connecting', 0), CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING],
        [at('closed', GRACE), null, CONNECTION_BANNER.FAILED],
        [at('closed', GRACE - 1), null, CONNECTION_BANNER.RECONNECTING],
        [at('closed', null), null, CONNECTION_BANNER.RECONNECTING],
        [at('closed', null), CONNECTION_BANNER.FAILED, CONNECTION_BANNER.RECONNECTING]
      ]
      for (const [input, current, expected] of cases) {
        assert.equal(bannerForStatus(input, now, { current }), expected, `${input.state} since ${input.since === null ? 'null' : now - input.since} ms, showing ${current}`)
      }
    })

    it("doesn't show a banner for a connection being made when none is showing", () => {
      assert.equal(bannerForStatus(at('connecting', 0), now), null)
      assert.equal(bannerForStatus(at('connecting', GRACE - 1), now, { current: null }), null)
      assert.equal(bannerForStatus(at('connecting', GRACE), now, { current: null }), CONNECTION_BANNER.RECONNECTING)
      assert.equal(bannerForStatus(at('connecting', null), now, { current: null }), CONNECTION_BANNER.RECONNECTING)
    })

    it('uses the given grace period', () => {
      assert.equal(bannerForStatus(at('closed', 500), now, { graceMs: 400 }), CONNECTION_BANNER.FAILED)
      assert.equal(bannerForStatus(at('closed', 500), now, { graceMs: 600 }), CONNECTION_BANNER.RECONNECTING)
    })

    it('keeps the current banner for an unknown state', () => {
      assert.equal(bannerForStatus(at('hibernating', 0), now, { current: CONNECTION_BANNER.OFFLINE }), CONNECTION_BANNER.OFFLINE)
      assert.equal(bannerForStatus(at('hibernating', 0), now), null)
    })
  })

  describe('controller', () => {
    it('shows no banner on a healthy connection', async () => {
      const t = harness({ answer: answering('open', { since: 0 }) })
      await t.start()
      assert.equal(t.env.calls, 1)
      assert.deepEqual(t.env.changes, [])
      assert.equal(t.controller.kind, null)
      assert.equal(t.controller.legacy, false)
    })

    it('shows the banner from the first answer when started during an outage (B5)', async () => {
      const t = harness({ answer: answering('reconnecting') })
      await t.start()
      assert.equal(t.env.calls, 1)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
    })

    it("doesn't flash a banner while the first connection is being made", async () => {
      const t = harness({ answer: (now) => Promise.resolve(status('connecting', { at: now, since: now - 100 })) })
      await t.start()
      assert.deepEqual(t.env.changes, [])
      t.controller.apply(t.current('open'))
      t.clock.advance(GRACE * 2)
      assert.deepEqual(t.env.changes, [])
    })

    it('shows the reconnecting banner once the first connection takes longer than the grace period', async () => {
      const t = harness({ answer: (now) => Promise.resolve(status('connecting', { at: now, since: now - 100 })) })
      await t.start()
      t.clock.advance(GRACE - 101)
      assert.deepEqual(t.env.changes, [])
      t.clock.advance(1)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
      assert.equal(t.env.calls, 1, 're-evaluated without a new query')
    })

    it('keeps a banner after the browser goes online while the socket is not open (B3)', async () => {
      const t = harness({ answer: answering('offline') })
      await t.start()
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE])
      // The network is back, the socket is connecting
      t.env.answer = answering('connecting')
      t.controller.apply(t.current('connecting'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING])
      // In status mode, connection events only trigger a query
      t.controller.onLegacyEvent(ONLINE)
      await settle()
      assert.equal(t.env.calls, 2)
      assert.equal(t.controller.legacy, false)
      assert.equal(t.controller.kind, CONNECTION_BANNER.RECONNECTING)
      t.controller.apply(t.current('open'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING, null])
    })

    it('shows "could not connect" only once the connection has been closed for the grace period', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      t.controller.apply(t.current('closed'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
      t.clock.advance(GRACE - 1)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
      t.clock.advance(1)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING, CONNECTION_BANNER.FAILED])
      assert.equal(t.env.calls, 1, 're-evaluated without a new query')
    })

    it('keeps reconnecting when the connection is re-created within the grace period', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      t.controller.apply(t.current('closed'))
      t.clock.advance(100)
      t.controller.apply(t.current('connecting'))
      t.clock.advance(GRACE * 2)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
    })

    it('shows the degraded banner and clears it on recovery (B7)', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      t.controller.apply(t.current('open', { degraded: true }))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.DEGRADED])
      t.controller.apply(t.current('open'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.DEGRADED, null])
    })

    it('clears the banner once reconnected', async () => {
      const t = harness({ answer: answering('reconnecting') })
      await t.start()
      t.controller.apply(t.current('open'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING, null])
    })

    it('calls onChange only when the banner changes', async () => {
      const t = harness({ answer: answering('reconnecting') })
      await t.start()
      for (let i = 0; i < 3; i++) {
        t.clock.advance(REFRESH)
        await settle()
        t.controller.apply(t.current('reconnecting'))
      }
      assert.equal(t.env.calls, 4)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
    })

    it('ignores statuses older than the last one applied', async () => {
      const answer = deferred()
      const t = harness({ answer: () => answer.promise })
      t.controller.start()
      const old = t.current('reconnecting')
      t.clock.advance(10)
      t.controller.apply(t.current('open'))
      answer.resolve(old)
      await settle()
      assert.equal(t.controller.kind, null)
      assert.deepEqual(t.env.changes, [])
      assert.equal(t.controller.legacy, false)
    })

    it('applies an older status if the clock went back', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      t.clock.set(t.clock.now() - 60e3)
      t.controller.apply(t.current('reconnecting'))
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
    })

    it('ignores invalid broadcasts', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      for (const invalid of [null, undefined, 'open', {}, { state: 'reconnecting' }, { at: t.clock.now() }]) {
        t.controller.apply(invalid)
      }
      assert.deepEqual(t.env.changes, [])
      assert.equal(t.controller.legacy, false)
    })

    it('queries the status periodically, on refresh() and on connection events', async () => {
      const t = harness({ answer: answering('open') })
      await t.start()
      t.clock.advance(REFRESH)
      await settle()
      assert.equal(t.env.calls, 2)
      t.controller.refresh()
      await settle()
      assert.equal(t.env.calls, 3)
      for (const event of [OFFLINE, RECONNECTING, RECONNECTION_FAILED, ONLINE]) {
        t.controller.onLegacyEvent(event)
        await settle()
      }
      assert.equal(t.env.calls, 7)
      assert.deepEqual(t.env.changes, [], 'events only trigger a query')
    })

    it('skips the periodic query while the tab is hidden', async () => {
      let visible = false
      const t = harness({ answer: answering('open'), isVisible: () => visible })
      await t.start()
      for (let i = 0; i < 3; i++) {
        t.clock.advance(REFRESH)
        await settle()
      }
      assert.equal(t.env.calls, 1, 'only the initial query')
      t.controller.refresh()
      await settle()
      assert.equal(t.env.calls, 2)
      visible = true
      t.clock.advance(REFRESH)
      await settle()
      assert.equal(t.env.calls, 3)
    })

    it('makes one query at a time, and one more for the refreshes requested meanwhile', async () => {
      // Shorter than the request timeout, so that the first query is still
      // in flight when the interval fires
      const refreshInterval = CONNECTION_STATUS_TIMEOUT / 2
      const answers = []
      const t = harness({
        answer: () => {
          const answer = deferred()
          answers.push(answer)
          return answer.promise
        },
        refreshInterval
      })
      t.controller.start()
      t.controller.refresh()
      t.controller.onLegacyEvent(OFFLINE)
      t.clock.advance(refreshInterval)
      assert.equal(t.env.calls, 1)
      answers[0].resolve(t.current('open'))
      await settle()
      assert.equal(t.env.calls, 2)
      answers[1].resolve(t.current('reconnecting'))
      await settle()
      assert.equal(t.env.calls, 2)
      assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
    })

    describe('legacy mode (service worker without the connection status)', () => {
      it('follows the connection events', async () => {
        const t = harness({ answer: rejecting() })
        await t.start()
        assert.equal(t.controller.legacy, true)
        assert.deepEqual(t.env.changes, [])
        const steps = [
          [OFFLINE, CONNECTION_BANNER.OFFLINE],
          [RECONNECTING, CONNECTION_BANNER.RECONNECTING],
          [RECONNECTION_FAILED, CONNECTION_BANNER.FAILED],
          [ONLINE, null],
          ['some-other-event', null]
        ]
        for (const [event, expected] of steps) {
          t.controller.onLegacyEvent(event)
          assert.equal(t.controller.kind, expected, event)
        }
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING, CONNECTION_BANNER.FAILED, null])
        assert.equal(t.env.calls, 1, 'events are not queries in legacy mode')
      })

      it('shows the offline banner when started while the device is offline', async () => {
        const t = harness({ answer: rejecting(), online: false })
        await t.start()
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE])
      })

      it('warns once, and keeps querying the status', async () => {
        const t = harness({ answer: rejecting() })
        await t.start()
        for (let i = 0; i < 3; i++) {
          t.clock.advance(REFRESH)
          await settle()
        }
        assert.equal(t.env.calls, 4)
        assert.equal(count('warn'), 1)
        assert.equal(t.controller.legacy, true)
      })

      it('keeps the current banner when the status becomes unavailable', async () => {
        const t = harness({ answer: answering('reconnecting') })
        await t.start()
        t.env.answer = rejecting()
        t.clock.advance(REFRESH)
        await settle()
        assert.equal(t.controller.legacy, true)
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
      })

      for (const reason of ['SW controller changed', 'SBP: selector not registered: some/other']) {
        it(`is not entered when a query fails after a status (${reason}): the status is kept, with one warning per run of failures`, async () => {
          const t = harness({ answer: answering('reconnecting') })
          await t.start()
          t.env.answer = rejecting(reason)
          for (let i = 0; i < 3; i++) {
            t.clock.advance(REFRESH)
            await settle()
          }
          assert.equal(t.env.calls, 4)
          assert.equal(t.controller.legacy, false)
          assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
          assert.equal(count('warn'), 1)
          t.env.answer = answering('open')
          t.clock.advance(REFRESH)
          await settle()
          t.env.answer = rejecting(reason)
          t.clock.advance(REFRESH)
          await settle()
          assert.equal(count('warn'), 2)
          assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING, null])
        })
      }

      it('is not entered when a query times out during a grace period, which still ends', async () => {
        const t = harness({ answer: answering('open') })
        await t.start()
        t.env.answer = () => new Promise(() => {})
        t.clock.advance(REFRESH + CONNECTION_STATUS_TIMEOUT - 1000)
        await settle()
        t.controller.apply(t.current('closed'))
        t.clock.advance(1000)
        await settle()
        assert.equal(t.controller.legacy, false)
        assert.equal(t.controller.kind, CONNECTION_BANNER.RECONNECTING)
        t.clock.advance(GRACE - 1000)
        assert.equal(t.controller.kind, CONNECTION_BANNER.FAILED)
      })

      it('is entered when a query fails while the device is offline, even after a status', async () => {
        const t = harness({ answer: answering('open') })
        await t.start()
        t.env.answer = rejecting('SW controller changed')
        t.env.online = false
        t.controller.refresh()
        await settle()
        assert.equal(t.controller.legacy, true)
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE])
      })

      it('ends once a query answers', async () => {
        const t = harness({ answer: rejecting() })
        await t.start()
        t.controller.onLegacyEvent(OFFLINE)
        t.env.answer = answering('reconnecting')
        t.clock.advance(REFRESH)
        await settle()
        assert.equal(t.controller.legacy, false)
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.OFFLINE, CONNECTION_BANNER.RECONNECTING])
        // Events trigger queries again
        t.controller.onLegacyEvent(ONLINE)
        await settle()
        assert.equal(t.env.calls, 3)
        assert.equal(t.controller.kind, CONNECTION_BANNER.RECONNECTING)
      })

      it('ends with a broadcast status', async () => {
        const t = harness({ answer: rejecting() })
        await t.start()
        t.controller.onLegacyEvent(RECONNECTING)
        t.controller.apply(t.current('open'))
        assert.equal(t.controller.legacy, false)
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING, null])
      })

      it('starts when a query is not answered in time, and a late answer ends it', async () => {
        const answers = []
        const t = harness({
          answer: () => {
            const answer = deferred()
            answers.push(answer)
            return answer.promise
          },
          // So that a refresh is requested while the first query waits
          refreshInterval: CONNECTION_STATUS_TIMEOUT / 2
        })
        t.controller.start()
        t.clock.advance(CONNECTION_STATUS_TIMEOUT - 1)
        await settle()
        assert.equal(t.controller.legacy, false)
        t.clock.advance(1)
        await settle()
        assert.equal(t.controller.legacy, true)
        // The refreshes requested meanwhile are made after the timeout
        assert.equal(t.env.calls, 2)
        answers[0].resolve(t.current('reconnecting'))
        await settle()
        assert.equal(t.controller.legacy, false)
        assert.deepEqual(t.env.changes, [CONNECTION_BANNER.RECONNECTING])
      })

      it('starts with an invalid answer', async () => {
        const t = harness({ answer: () => Promise.resolve(undefined) })
        await t.start()
        assert.equal(t.controller.legacy, true)
      })
    })

    it('never throws', async () => {
      const t = harness({
        answer: () => { throw new Error('getStatus') },
        onChange: () => { throw new Error('onChange') },
        isOnline: () => { throw new Error('isOnline') },
        isVisible: () => { throw new Error('isVisible') }
      })
      await t.start()
      assert.equal(t.controller.legacy, true)
      t.clock.advance(REFRESH)
      await settle()
      assert.equal(t.env.calls, 2, 'a tab whose visibility is unknown keeps querying')
      t.controller.onLegacyEvent(OFFLINE)
      assert.equal(t.controller.kind, CONNECTION_BANNER.OFFLINE)
      t.controller.apply(t.current('open'))
      assert.equal(t.controller.kind, null)
      assert.ok(count('error') >= 2)
    })
  })
})
