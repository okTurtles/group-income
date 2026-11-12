/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../../../test/unit-helpers/fakeClock.js'
import { connectionStatus } from '../../../../test/unit-helpers/connectionStatus.js'
import { settle } from '../../../../test/unit-helpers/utils.js'
import { CONNECTION_STATUS_TIMEOUT } from '../../../controller/connectionStatus.js'
import {
  SENT_MESSAGE_CHECK_DELAY,
  checkSentMessageLater,
  isChatroomUnsubscribed,
  isHeightProcessed,
  resyncChatroomIfUnsubscribed,
  trackPublishedHeight
} from './chatroomResync.js'

const ROOM = 'zChatroom'
const OTHER = 'zOther'

// A status from `sw/connection/status` (see `ConnectionStatus`)
const status = (state, { missing = [], pending = [], degraded = false } = {}) => connectionStatus(state, {
  at: 1,
  since: 1,
  wanted: 3,
  missing,
  pending,
  oldestPendingSince: pending.length ? 1 : null,
  unsubscribedSince: missing.length || pending.length ? 1 : null,
  degraded
})

const syncSpy = (impl = () => Promise.resolve()) => {
  const calls = []
  const sync = (id) => {
    calls.push(id)
    return impl(id)
  }
  return { sync, calls }
}

// A selector dispatcher (`sbp`) with the app's selectors that the checks use.
// Records the selectors called, and the calls of `isJoinedChatRoom`.
const appSelectors = ({ latestHeight = 9, joined = true, connection = status('open', { missing: [ROOM] }) } = {}) => {
  const calls = []
  const selectors = {
    'state/vuex/state': () => ({ contracts: { [OTHER]: { height: 20 }, [ROOM]: { height: latestHeight } } }),
    'state/vuex/getters': () => ({
      isJoinedChatRoom: (id) => {
        calls.push(['isJoinedChatRoom', id])
        return joined
      }
    }),
    'chelonia/contract/sync': () => Promise.resolve(),
    'sw/connection/status': () => Promise.resolve(connection)
  }
  const sbp = (selector, ...args) => {
    calls.push([selector, ...args])
    if (!selectors[selector]) throw new Error(`SBP: selector not registered: ${selector}`)
    return selectors[selector](...args)
  }
  return { sbp, calls }
}

// Captures `console.warn` while `fn` runs
const withWarnings = async (fn) => {
  const warnings = []
  const original = console.warn
  console.warn = (...args) => { warnings.push(args) }
  try {
    await fn(warnings)
  } finally {
    console.warn = original
  }
  return warnings
}

describe('chatroomResync', () => {
  describe('isChatroomUnsubscribed', () => {
    it('is true for a chatroom missing while the connection is open', () => {
      assert.equal(isChatroomUnsubscribed(status('open', { missing: [OTHER, ROOM] }), ROOM), true)
    })

    it('is true for a chatroom pending while degraded', () => {
      assert.equal(isChatroomUnsubscribed(status('open', { pending: [ROOM], degraded: true }), ROOM), true)
    })

    it('is false for a chatroom pending while not degraded (just joined)', () => {
      assert.equal(isChatroomUnsubscribed(status('open', { pending: [ROOM] }), ROOM), false)
    })

    it('is false for a subscribed chatroom, even when others are missing', () => {
      assert.equal(isChatroomUnsubscribed(status('open', { missing: [OTHER], pending: [OTHER], degraded: true }), ROOM), false)
    })

    it('is false when the connection is not open', () => {
      for (const state of ['connecting', 'reconnecting', 'offline', 'closed']) {
        assert.equal(isChatroomUnsubscribed(status(state, { missing: [ROOM], pending: [ROOM], degraded: true }), ROOM), false, state)
      }
    })

    it('is false for a missing or malformed status', () => {
      for (const value of [undefined, null, 'open', 1, {}, { state: 'open' }, { state: 'open', missing: ROOM }, { state: 'open', pending: [ROOM], degraded: 'yes' }]) {
        assert.equal(isChatroomUnsubscribed(value, ROOM), false, JSON.stringify(value))
      }
    })
  })

  describe('isHeightProcessed', () => {
    it('compares the latest processed height with the height of the event', () => {
      assert.equal(isHeightProcessed(4, 5), false)
      assert.equal(isHeightProcessed(5, 5), true)
      assert.equal(isHeightProcessed(6, 5), true)
      assert.equal(isHeightProcessed(0, 0), true)
    })

    it('is false when the latest height is unknown', () => {
      for (const value of [undefined, null, '5', NaN]) {
        assert.equal(isHeightProcessed(value, 5), false, String(value))
      }
    })
  })

  describe('resyncChatroomIfUnsubscribed', () => {
    const run = (overrides = {}) => {
      const clock = fakeClock()
      const spy = syncSpy(overrides.syncImpl)
      const promise = resyncChatroomIfUnsubscribed({
        chatRoomID: ROOM,
        getStatus: () => Promise.resolve(status('open', { missing: [ROOM] })),
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        ...overrides
      })
      return { clock, spy, promise }
    }

    it('syncs a chatroom that is not subscribed, once', async () => {
      const warnings = await withWarnings(async () => {
        const { spy, promise, clock } = run()
        assert.equal(await promise, true)
        assert.deepEqual(spy.calls, [ROOM])
        assert.equal(clock.pendingTimers(), 0)
      })
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0].includes(ROOM))
    })

    it('does nothing for a subscribed chatroom', async () => {
      const { spy, promise, clock } = run({ getStatus: () => Promise.resolve(status('open')) })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('does nothing when the chatroom is no longer joined', async () => {
      const { spy, promise } = run({ isJoined: () => false })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
    })

    it('does nothing when the status is unavailable (older service worker)', async () => {
      const warnings = await withWarnings(async () => {
        const { spy, promise, clock } = run({ getStatus: () => Promise.reject(new Error('SBP: selector not registered: sw/connection/status')) })
        assert.equal(await promise, false)
        assert.deepEqual(spy.calls, [])
        assert.equal(clock.pendingTimers(), 0)
      })
      assert.equal(warnings.length, 0)
    })

    it('logs other failures to get the status', async () => {
      const warnings = await withWarnings(async () => {
        const { spy, promise } = run({ getStatus: () => { throw new Error('boom') } })
        assert.equal(await promise, false)
        assert.deepEqual(spy.calls, [])
      })
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0].includes(ROOM))
      assert.equal(warnings[0][2]?.message, 'boom')
    })

    it('gives up when the status request stays unanswered', async () => {
      const warnings = await withWarnings(async () => {
        const { spy, promise, clock } = run({ getStatus: () => new Promise(() => {}) })
        let result
        promise.then(value => { result = value })
        await settle()
        clock.advance(CONNECTION_STATUS_TIMEOUT - 1)
        await settle()
        assert.equal(result, undefined)
        clock.advance(1)
        await settle()
        assert.equal(result, false)
        assert.deepEqual(spy.calls, [])
      })
      assert.equal(warnings.length, 1)
      assert.equal(warnings[0][2]?.message, 'Timed out getting the connection status')
    })

    it('never rejects when the sync or isJoined fail', async () => {
      const warnings = await withWarnings(async () => {
        const rejecting = run({ syncImpl: () => Promise.reject(new Error('sync failed')) })
        assert.equal(await rejecting.promise, true)
        const throwing = run({ syncImpl: () => { throw new Error('sync threw') } })
        assert.equal(await throwing.promise, true)
        const joinedThrows = run({ isJoined: () => { throw new Error('getter threw') } })
        assert.equal(await joinedThrows.promise, false)
        assert.deepEqual(joinedThrows.spy.calls, [])
      })
      // Two "re-syncing" warnings, two sync errors and one isJoined error
      assert.equal(warnings.length, 5)
    })

    it("uses the app's selectors by default", async () => {
      const clock = fakeClock()
      const app = appSelectors()
      await withWarnings(async () => {
        assert.equal(await resyncChatroomIfUnsubscribed({ chatRoomID: ROOM, sbp: app.sbp, timers: clock.timers }), true)
      })
      assert.deepEqual(app.calls, [
        ['sw/connection/status'],
        ['state/vuex/getters'],
        ['isJoinedChatRoom', ROOM],
        ['chelonia/contract/sync', ROOM]
      ])
    })
  })

  describe('checkSentMessageLater', () => {
    const run = (overrides = {}) => {
      const clock = fakeClock()
      const spy = syncSpy(overrides.syncImpl)
      const state = { latestHeight: 9, joined: true }
      const options = {
        chatRoomID: ROOM,
        height: 10,
        getLatestHeight: () => state.latestHeight,
        isJoined: () => state.joined,
        sync: spy.sync,
        timers: clock.timers,
        checks: new Map(),
        ...overrides
      }
      checkSentMessageLater(options)
      return { clock, spy, state, checks: options.checks, options }
    }

    // Checks of `ROOM` and `OTHER` that share one clock and one map of pending
    // checks
    const checker = () => {
      const clock = fakeClock()
      const spy = syncSpy()
      const checks = new Map()
      const latest = { [ROOM]: 9, [OTHER]: 3 }
      const check = (chatRoomID, height) => checkSentMessageLater({
        chatRoomID,
        height,
        getLatestHeight: () => latest[chatRoomID],
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        checks
      })
      return { clock, spy, checks, latest, check }
    }

    it('does nothing when the message has been received in time', async () => {
      const { clock, spy, state } = run()
      state.latestHeight = 10
      clock.advance(SENT_MESSAGE_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('syncs the chatroom when the message has not been received after the delay', async () => {
      const warnings = await withWarnings(async () => {
        const { clock, spy } = run()
        clock.advance(SENT_MESSAGE_CHECK_DELAY - 1)
        await settle()
        assert.deepEqual(spy.calls, [])
        clock.advance(1)
        await settle()
        assert.deepEqual(spy.calls, [ROOM])
        clock.advance(10 * SENT_MESSAGE_CHECK_DELAY)
        await settle()
        assert.deepEqual(spy.calls, [ROOM])
      })
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0].includes(ROOM))
    })

    it('syncs when the latest height is unknown', async () => {
      const { clock, spy } = run({ getLatestHeight: () => undefined })
      await withWarnings(async () => {
        clock.advance(SENT_MESSAGE_CHECK_DELAY)
        await settle()
      })
      assert.deepEqual(spy.calls, [ROOM])
    })

    it('does nothing when the chatroom is no longer joined', async () => {
      const { clock, spy, state } = run()
      state.joined = false
      clock.advance(SENT_MESSAGE_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [])
    })

    it('never throws when the sync or the getters fail', async () => {
      const warnings = await withWarnings(async () => {
        const rejecting = run({ syncImpl: () => Promise.reject(new Error('sync failed')) })
        rejecting.clock.advance(SENT_MESSAGE_CHECK_DELAY)
        const throwing = run({ syncImpl: () => { throw new Error('sync threw') } })
        throwing.clock.advance(SENT_MESSAGE_CHECK_DELAY)
        const heightThrows = run({ getLatestHeight: () => { throw new Error('getter threw') } })
        heightThrows.clock.advance(SENT_MESSAGE_CHECK_DELAY)
        await settle()
        assert.deepEqual(rejecting.spy.calls, [ROOM])
        assert.deepEqual(throwing.spy.calls, [ROOM])
        assert.deepEqual(heightThrows.spy.calls, [])
      })
      // Two "re-syncing" warnings, two sync errors and one getter error
      assert.equal(warnings.length, 5)
    })

    it('makes one sync and one warning for a burst', async () => {
      const { clock, spy, checks, check } = checker()
      const warnings = await withWarnings(async () => {
        check(ROOM, 10)
        assert.equal(clock.pendingTimers(), 1)
        clock.advance(1000)
        check(ROOM, 11)
        assert.equal(clock.pendingTimers(), 1)
        clock.advance(1000)
        check(ROOM, 12)
        assert.equal(clock.pendingTimers(), 1)
        clock.advance(SENT_MESSAGE_CHECK_DELAY - 1)
        await settle()
        assert.deepEqual(spy.calls, [])
        clock.advance(1)
        await settle()
      })
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0][0].includes('height 12'), warnings[0][0])
      assert.equal(checks.size, 0)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('covers an older or equal height with the pending check', async () => {
      const { clock, spy, checks, check } = checker()
      const warnings = await withWarnings(async () => {
        check(ROOM, 12)
        clock.advance(1000)
        check(ROOM, 12)
        check(ROOM, 11)
        assert.equal(clock.pendingTimers(), 1)
        assert.equal(checks.get(ROOM)?.height, 12)
        clock.advance(SENT_MESSAGE_CHECK_DELAY - 1000)
        await settle()
      })
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0][0].includes('height 12'), warnings[0][0])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('replaces the pending check with a newer height', async () => {
      for (const [latestHeight, expected] of [[10, [ROOM]], [11, []]]) {
        const { clock, spy, latest, check } = checker()
        await withWarnings(async () => {
          check(ROOM, 10)
          clock.advance(3000)
          check(ROOM, 11)
          clock.advance(SENT_MESSAGE_CHECK_DELAY - 3000)
          await settle()
          assert.deepEqual(spy.calls, [])
          assert.equal(clock.pendingTimers(), 1)
          latest[ROOM] = latestHeight
          clock.advance(3000)
          await settle()
        })
        assert.deepEqual(spy.calls, expected, `latest height ${latestHeight}`)
        assert.equal(clock.pendingTimers(), 0)
      }
    })

    it('keeps the replacement when a replaced timer still fires', async () => {
      const { clock, spy, checks, latest, check } = checker()
      clock.timers.clearTimeout = () => {}
      check(ROOM, 10)
      clock.advance(1000)
      check(ROOM, 11)
      latest[ROOM] = 10
      clock.advance(SENT_MESSAGE_CHECK_DELAY - 1000)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(checks.get(ROOM)?.height, 11)
      latest[ROOM] = 11
      clock.advance(1000)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(checks.size, 0)
    })

    it('keeps the checks of different chatrooms independent', async () => {
      for (const [otherReceived, expected] of [[false, [OTHER, ROOM]], [true, [ROOM]]]) {
        const { clock, spy, checks, latest, check } = checker()
        const warnings = await withWarnings(async () => {
          check(ROOM, 10)
          check(OTHER, 4)
          assert.equal(clock.pendingTimers(), 2)
          clock.advance(1000)
          check(ROOM, 11)
          assert.equal(clock.pendingTimers(), 2)
          assert.equal(checks.size, 2)
          if (otherReceived) latest[OTHER] = 4
          clock.advance(SENT_MESSAGE_CHECK_DELAY)
          await settle()
        })
        assert.deepEqual(spy.calls, expected, `${OTHER} received: ${String(otherReceived)}`)
        assert.equal(warnings.length, expected.length)
        assert.equal(checks.size, 0)
      }
    })

    it('removes the entry when the check runs, whatever its outcome', async () => {
      const outcomes = {
        processed: { getLatestHeight: () => 10 },
        'not joined': { isJoined: () => false },
        'getter throws': { getLatestHeight: () => { throw new Error('getter threw') } }
      }
      for (const [outcome, overrides] of Object.entries(outcomes)) {
        await withWarnings(async () => {
          const { clock, spy, checks, options } = run(overrides)
          assert.equal(checks.size, 1, outcome)
          clock.advance(SENT_MESSAGE_CHECK_DELAY)
          await settle()
          assert.deepEqual(spy.calls, [], outcome)
          assert.equal(checks.size, 0, outcome)
          assert.equal(clock.pendingTimers(), 0, outcome)
          checkSentMessageLater(options)
          assert.equal(clock.pendingTimers(), 1, outcome)
          assert.equal(checks.size, 1, outcome)
        })
      }
    })

    it("uses the app's selectors by default", async () => {
      const received = appSelectors({ latestHeight: 10 })
      const notReceived = appSelectors({ latestHeight: 9 })
      const clock = fakeClock()
      await withWarnings(async () => {
        checkSentMessageLater({ chatRoomID: ROOM, height: 10, sbp: received.sbp, timers: clock.timers, checks: new Map() })
        // Without `checks`, the module's map, which must be left empty
        checkSentMessageLater({ chatRoomID: ROOM, height: 10, sbp: notReceived.sbp, timers: clock.timers })
        checkSentMessageLater({ chatRoomID: ROOM, height: 10, sbp: notReceived.sbp, timers: clock.timers })
        assert.equal(clock.pendingTimers(), 2)
        clock.advance(SENT_MESSAGE_CHECK_DELAY)
        await settle()
        assert.equal(clock.pendingTimers(), 0)
        checkSentMessageLater({ chatRoomID: ROOM, height: 10, sbp: received.sbp, timers: clock.timers })
        assert.equal(clock.pendingTimers(), 1)
        clock.advance(SENT_MESSAGE_CHECK_DELAY)
        await settle()
      })
      assert.deepEqual(received.calls, [['state/vuex/state'], ['state/vuex/state']])
      assert.deepEqual(notReceived.calls, [
        ['state/vuex/state'],
        ['state/vuex/getters'],
        ['isJoinedChatRoom', ROOM],
        ['chelonia/contract/sync', ROOM]
      ])
    })
  })

  describe('trackPublishedHeight', () => {
    const run = () => {
      const clock = fakeClock()
      const spy = syncSpy()
      const state = { latestHeight: 9 }
      const options = {
        getLatestHeight: () => state.latestHeight,
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        checks: new Map()
      }
      const tracker = trackPublishedHeight(ROOM, options)
      return { clock, spy, state, options, tracker }
    }

    it('checks the height of the last attempt', async () => {
      const { clock, spy, state, tracker } = run()
      tracker.beforeRequest({ height: () => 10 })
      tracker.beforeRequest({ height: () => 11 })
      assert.equal(clock.pendingTimers(), 0)
      tracker.published()
      state.latestHeight = 10
      const warnings = await withWarnings(async () => {
        clock.advance(SENT_MESSAGE_CHECK_DELAY - 1)
        await settle()
        assert.deepEqual(spy.calls, [])
        clock.advance(1)
        await settle()
      })
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0][0].includes('height 11'), warnings[0][0])
    })

    it('coalesces with a check already pending', async () => {
      const { clock, spy, state, options, tracker } = run()
      checkSentMessageLater({ ...options, chatRoomID: ROOM, height: 10 })
      assert.equal(clock.pendingTimers(), 1)
      clock.advance(1000)
      tracker.beforeRequest({ height: () => 11 })
      tracker.published()
      assert.equal(clock.pendingTimers(), 1)
      assert.equal(options.checks.get(ROOM)?.height, 11)
      state.latestHeight = 10
      const warnings = await withWarnings(async () => {
        clock.advance(SENT_MESSAGE_CHECK_DELAY)
        await settle()
      })
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0][0].includes('height 11'), warnings[0][0])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('does nothing when no attempt was made', () => {
      const { clock, tracker } = run()
      tracker.published()
      assert.equal(clock.pendingTimers(), 0)
    })

    it('ignores a height that is not a number', () => {
      const { clock, tracker } = run()
      tracker.beforeRequest({ height: () => undefined })
      tracker.published()
      assert.equal(clock.pendingTimers(), 0)
    })

    it('never throws from the hook', async () => {
      const { clock, tracker } = run()
      const warnings = await withWarnings(() => {
        tracker.beforeRequest({ height: () => { throw new Error('bad') } })
        tracker.published()
      })
      assert.equal(warnings.length, 1)
      assert.ok(warnings[0].includes(ROOM))
      assert.equal(clock.pendingTimers(), 0)
    })
  })
})
