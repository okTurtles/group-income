/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../../../test/unit-helpers/fakeClock.js'
import { connectionStatus } from '../../../../test/unit-helpers/connectionStatus.js'
import { deferred, settle, silenceConsole } from '../../../../test/unit-helpers/utils.js'
import { CONNECTION_STATUS_TIMEOUT } from '../../../controller/connectionStatus.js'
import {
  PUBLISHED_EVENT_CHECK_DELAY,
  RECENT_SYNC_WINDOW,
  SHARED_SYNC_MAX_AGE,
  checkPublishedEvent,
  checkPublishedEventLater,
  isChatroomUnsubscribed,
  isHeightProcessed,
  resyncChatroomIfUnsubscribed
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

describe('chatroomResync', () => {
  // Each test asserts what it logged: the warnings it expects, or nothing
  const logs = silenceConsole()
  const warnings = () => logs.map(({ level, args }) => {
    assert.equal(level, 'warn')
    return args
  })

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
    const run = ({ syncImpl, ...overrides } = {}) => {
      const clock = fakeClock()
      const spy = syncSpy(syncImpl)
      const promise = resyncChatroomIfUnsubscribed({
        chatRoomID: ROOM,
        getStatus: () => Promise.resolve(status('open', { missing: [ROOM] })),
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        syncs: new Map(),
        now: clock.now,
        ...overrides
      })
      return { clock, spy, promise }
    }

    it('syncs a chatroom that is not subscribed, once', async () => {
      const { spy, promise, clock } = run()
      assert.equal(await promise, true)
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(clock.pendingTimers(), 0)
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0].includes(ROOM))
    })

    it('does nothing for a subscribed chatroom', async () => {
      const { spy, promise, clock } = run({ getStatus: () => Promise.resolve(status('open')) })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.equal(clock.pendingTimers(), 0)
      assert.deepEqual(logs, [])
    })

    it('does nothing when the chatroom is no longer joined', async () => {
      const { spy, promise } = run({ isJoined: () => false })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.deepEqual(logs, [])
    })

    it('does nothing when the status is unavailable (older service worker)', async () => {
      const { spy, promise, clock } = run({ getStatus: () => Promise.reject(new Error('SBP: selector not registered: sw/connection/status')) })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.equal(clock.pendingTimers(), 0)
      assert.deepEqual(logs, [])
    })

    it('logs other failures to get the status', async () => {
      const { spy, promise } = run({ getStatus: () => { throw new Error('boom') } })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('Could not get the connection status'), warnings()[0][0])
      assert.equal(warnings()[0][1], ROOM)
      assert.equal(warnings()[0][2]?.message, 'boom')
    })

    it('gives up when the status request stays unanswered', async () => {
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
      assert.equal(warnings().length, 1)
      assert.equal(warnings()[0][2]?.message, 'Timed out getting the connection status')
    })

    it('logs a failure of isJoined as such', async () => {
      const { spy, promise } = run({ isJoined: () => { throw new Error('getter threw') } })
      assert.equal(await promise, false)
      assert.deepEqual(spy.calls, [])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('Error checking the chatroom subscription'), warnings()[0][0])
      assert.equal(warnings()[0][1], ROOM)
      assert.equal(warnings()[0][2]?.message, 'getter threw')
    })

    it('never rejects when the sync fails', async () => {
      const rejecting = run({ syncImpl: () => Promise.reject(new Error('sync failed')) })
      assert.equal(await rejecting.promise, true)
      const throwing = run({ syncImpl: () => { throw new Error('sync threw') } })
      assert.equal(await throwing.promise, true)
      // A "re-syncing" warning, then a sync error, for each
      assert.deepEqual(warnings().map(args => args[2]?.message), [undefined, 'sync failed', undefined, 'sync threw'])
    })

    it("uses the app's selectors by default", async () => {
      const clock = fakeClock()
      const app = appSelectors()
      assert.equal(await resyncChatroomIfUnsubscribed({ chatRoomID: ROOM, sbp: app.sbp, timers: clock.timers, syncs: new Map() }), true)
      assert.deepEqual(app.calls, [
        ['sw/connection/status'],
        ['state/vuex/getters'],
        ['isJoinedChatRoom', ROOM],
        ['chelonia/contract/sync', ROOM]
      ])
      assert.equal(warnings().length, 1)
    })
  })

  describe('checkPublishedEventLater', () => {
    const run = ({ syncImpl, ...overrides } = {}) => {
      const clock = fakeClock()
      const spy = syncSpy(syncImpl)
      const state = { latestHeight: 9, joined: true }
      const options = {
        chatRoomID: ROOM,
        height: 10,
        getLatestHeight: () => state.latestHeight,
        isJoined: () => state.joined,
        sync: spy.sync,
        timers: clock.timers,
        checks: new Map(),
        syncs: new Map(),
        now: clock.now,
        ...overrides
      }
      checkPublishedEventLater(options)
      return { clock, spy, state, checks: options.checks, options }
    }

    // Checks of `ROOM` and `OTHER` that share one clock, one map of pending
    // checks and one map of syncs
    const checker = () => {
      const clock = fakeClock()
      const spy = syncSpy()
      const checks = new Map()
      const syncs = new Map()
      const latest = { [ROOM]: 9, [OTHER]: 3 }
      const check = (chatRoomID, height) => checkPublishedEventLater({
        chatRoomID,
        height,
        getLatestHeight: () => latest[chatRoomID],
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        checks,
        syncs,
        now: clock.now
      })
      return { clock, spy, checks, latest, check }
    }

    it('does nothing when the event has been received in time', async () => {
      const { clock, spy, state } = run()
      state.latestHeight = 10
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(clock.pendingTimers(), 0)
      assert.deepEqual(logs, [])
    })

    it('syncs the chatroom when the event has not been received after the delay', async () => {
      const { clock, spy } = run()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 1)
      await settle()
      assert.deepEqual(spy.calls, [])
      clock.advance(1)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      clock.advance(10 * PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0].includes(ROOM))
    })

    it('syncs when the latest height is unknown', async () => {
      const { clock, spy } = run({ getLatestHeight: () => undefined })
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
    })

    it('does nothing when the chatroom is no longer joined', async () => {
      const { clock, spy, state } = run()
      state.joined = false
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.deepEqual(logs, [])
    })

    it('never throws when the sync or the getters fail', async () => {
      const rejecting = run({ syncImpl: () => Promise.reject(new Error('sync failed')) })
      rejecting.clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      const throwing = run({ syncImpl: () => { throw new Error('sync threw') } })
      throwing.clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      const heightThrows = run({ getLatestHeight: () => { throw new Error('getter threw') } })
      heightThrows.clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(rejecting.spy.calls, [ROOM])
      assert.deepEqual(throwing.spy.calls, [ROOM])
      assert.deepEqual(heightThrows.spy.calls, [])
      // Two "re-syncing" warnings, two sync errors and one getter error
      assert.equal(warnings().length, 5)
    })

    it('makes one sync and one warning for a burst', async () => {
      const { clock, spy, checks, check } = checker()
      check(ROOM, 10)
      assert.equal(clock.pendingTimers(), 1)
      clock.advance(1000)
      check(ROOM, 11)
      assert.equal(clock.pendingTimers(), 1)
      clock.advance(1000)
      check(ROOM, 12)
      assert.equal(clock.pendingTimers(), 1)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 1)
      await settle()
      assert.deepEqual(spy.calls, [])
      clock.advance(1)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('height 12'), warnings()[0][0])
      assert.equal(checks.size, 0)
      assert.equal(clock.pendingTimers(), 0)
    })

    it('covers an older or equal height with the pending check', async () => {
      const { clock, spy, checks, check } = checker()
      check(ROOM, 12)
      clock.advance(1000)
      check(ROOM, 12)
      check(ROOM, 11)
      assert.equal(clock.pendingTimers(), 1)
      assert.equal(checks.get(ROOM)?.height, 12)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 1000)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('height 12'), warnings()[0][0])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('replaces the pending check with a newer height', async () => {
      for (const [latestHeight, expected] of [[10, [ROOM]], [11, []]]) {
        const { clock, spy, latest, check } = checker()
        check(ROOM, 10)
        clock.advance(3000)
        check(ROOM, 11)
        clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 3000)
        await settle()
        assert.deepEqual(spy.calls, [])
        assert.equal(clock.pendingTimers(), 1)
        latest[ROOM] = latestHeight
        clock.advance(3000)
        await settle()
        assert.deepEqual(spy.calls, expected, `latest height ${latestHeight}`)
        assert.equal(clock.pendingTimers(), 0)
      }
      // From the first run only
      assert.equal(warnings().length, 1)
    })

    it('keeps the replacement when a replaced timer still fires', async () => {
      const { clock, spy, checks, latest, check } = checker()
      clock.timers.clearTimeout = () => {}
      check(ROOM, 10)
      clock.advance(1000)
      check(ROOM, 11)
      latest[ROOM] = 10
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 1000)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(checks.get(ROOM)?.height, 11)
      latest[ROOM] = 11
      clock.advance(1000)
      await settle()
      assert.deepEqual(spy.calls, [])
      assert.equal(checks.size, 0)
      assert.deepEqual(logs, [])
    })

    it('keeps the checks of different chatrooms independent', async () => {
      for (const [otherReceived, expected] of [[false, [OTHER, ROOM]], [true, [ROOM]]]) {
        const before = logs.length
        const { clock, spy, checks, latest, check } = checker()
        check(ROOM, 10)
        check(OTHER, 4)
        assert.equal(clock.pendingTimers(), 2)
        clock.advance(1000)
        check(ROOM, 11)
        assert.equal(clock.pendingTimers(), 2)
        assert.equal(checks.size, 2)
        if (otherReceived) latest[OTHER] = 4
        clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
        await settle()
        assert.deepEqual(spy.calls, expected, `${OTHER} received: ${String(otherReceived)}`)
        assert.equal(warnings().length - before, expected.length)
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
        const { clock, spy, checks, options } = run(overrides)
        assert.equal(checks.size, 1, outcome)
        clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
        await settle()
        assert.deepEqual(spy.calls, [], outcome)
        assert.equal(checks.size, 0, outcome)
        assert.equal(clock.pendingTimers(), 0, outcome)
        checkPublishedEventLater(options)
        assert.equal(clock.pendingTimers(), 1, outcome)
        assert.equal(checks.size, 1, outcome)
      }
      // From "getter throws" only
      assert.equal(warnings().length, 1)
    })

    it("uses the app's selectors by default", async () => {
      const received = appSelectors({ latestHeight: 10 })
      const notReceived = appSelectors({ latestHeight: 9 })
      const clock = fakeClock()
      const syncs = new Map()
      checkPublishedEventLater({ chatRoomID: ROOM, height: 10, sbp: received.sbp, timers: clock.timers, checks: new Map(), syncs })
      // Without `checks`, the module's map, which must be left empty
      checkPublishedEventLater({ chatRoomID: ROOM, height: 10, sbp: notReceived.sbp, timers: clock.timers, syncs })
      checkPublishedEventLater({ chatRoomID: ROOM, height: 10, sbp: notReceived.sbp, timers: clock.timers, syncs })
      assert.equal(clock.pendingTimers(), 2)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.equal(clock.pendingTimers(), 0)
      checkPublishedEventLater({ chatRoomID: ROOM, height: 10, sbp: received.sbp, timers: clock.timers, syncs })
      assert.equal(clock.pendingTimers(), 1)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(received.calls, [['state/vuex/state'], ['state/vuex/state']])
      assert.deepEqual(notReceived.calls, [
        ['state/vuex/state'],
        ['state/vuex/getters'],
        ['isJoinedChatRoom', ROOM],
        ['chelonia/contract/sync', ROOM]
      ])
      assert.equal(warnings().length, 1)
    })
  })

  describe('checkPublishedEvent', () => {
    const run = () => {
      const clock = fakeClock()
      const spy = syncSpy()
      const options = {
        getLatestHeight: () => 9,
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        checks: new Map(),
        syncs: new Map(),
        now: clock.now
      }
      return { clock, spy, options }
    }

    it('checks the height of the published event', async () => {
      const { clock, spy, options } = run()
      checkPublishedEvent(ROOM, { height: () => 11 }, options)
      assert.equal(options.checks.get(ROOM)?.height, 11)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('height 11'), warnings()[0][0])
    })

    it('coalesces with a check already pending', async () => {
      const { clock, spy, options } = run()
      checkPublishedEventLater({ ...options, chatRoomID: ROOM, height: 10 })
      clock.advance(1000)
      checkPublishedEvent(ROOM, { height: () => 11 }, options)
      assert.equal(clock.pendingTimers(), 1)
      assert.equal(options.checks.get(ROOM)?.height, 11)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(spy.calls, [ROOM])
      assert.equal(warnings().length, 1)
      assert.ok(warnings()[0][0].includes('height 11'), warnings()[0][0])
      assert.equal(clock.pendingTimers(), 0)
    })

    it('does nothing for a result without a numeric height', () => {
      const { clock, options } = run()
      for (const result of [undefined, null, {}, { height: 11 }, { height: () => undefined }]) {
        checkPublishedEvent(ROOM, result, options)
      }
      assert.equal(clock.pendingTimers(), 0)
      assert.deepEqual(logs, [])
    })

    it('never throws', () => {
      const { clock, options } = run()
      checkPublishedEvent(ROOM, { height: () => { throw new Error('bad') } }, options)
      assert.equal(warnings().length, 1)
      assert.equal(warnings()[0][1], ROOM)
      assert.equal(warnings()[0][2]?.message, 'bad')
      assert.equal(clock.pendingTimers(), 0)
    })
  })

  // The check of a published event and the sync when a chatroom is opened
  describe('shared syncs', () => {
    const setup = () => {
      const clock = fakeClock()
      const calls = []
      const results = []
      // Each sync settles when the test says so
      const sync = (id) => {
        calls.push(id)
        const d = deferred()
        results.push(d)
        return d.promise
      }
      const syncs = new Map()
      const latest = { [ROOM]: 9, [OTHER]: 3 }
      const check = (chatRoomID = ROOM, height = 10) => checkPublishedEventLater({
        chatRoomID, height, getLatestHeight: () => latest[chatRoomID], isJoined: () => true, sync, timers: clock.timers, checks: new Map(), syncs, now: clock.now
      })
      const open = (chatRoomID = ROOM) => resyncChatroomIfUnsubscribed({
        chatRoomID, getStatus: () => Promise.resolve(status('open', { missing: [chatRoomID] })), isJoined: () => true, sync, timers: clock.timers, syncs, now: clock.now
      })
      return { clock, calls, results, syncs, latest, check, open }
    }

    // What each warning was about, in order
    const warned = () => warnings().map(([text, chatRoomID]) => {
      const kind = text.includes('not subscribed') ? 'open' : text.includes('not received') ? 'check' : text.includes('Error re-syncing') ? 'sync error' : text
      return `${kind} ${chatRoomID}`
    })

    it('the check makes no sync when one started after it is running, and succeeds', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      const opened = open()
      await settle()
      assert.deepEqual(calls, [ROOM])
      clock.advance(100)
      await settle()
      assert.deepEqual(calls, [ROOM])
      results[0].resolve()
      assert.equal(await opened, true)
      await settle()
      assert.deepEqual(calls, [ROOM])
      // The check's time limit on waiting (SHARED_SYNC_MAX_AGE) is cleared
      assert.equal(clock.pendingTimers(), 0)
      assert.deepEqual(warned(), [`open ${ROOM}`])
    })

    it('the check syncs when the running sync that started after it then fails', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      const opened = open()
      await settle()
      clock.advance(100)
      await settle()
      assert.deepEqual(calls, [ROOM])
      results[0].reject(new Error('sync failed'))
      assert.equal(await opened, true)
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`, `sync error ${ROOM}`, `check ${ROOM}`])
    })

    it('the check makes no sync when one started after it has succeeded, although the height is still old', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      const opened = open()
      await settle()
      results[0].resolve()
      assert.equal(await opened, true)
      clock.advance(100)
      await settle()
      assert.deepEqual(calls, [ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`])
    })

    it('the check syncs when the sync that started after it failed', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      const opened = open()
      await settle()
      results[0].reject(new Error('sync failed'))
      assert.equal(await opened, true)
      clock.advance(100)
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`, `sync error ${ROOM}`, `check ${ROOM}`])
    })

    it('the check syncs when the running sync started before it', async () => {
      const { clock, calls, results, check, open } = setup()
      const opened = open()
      await settle()
      assert.deepEqual(calls, [ROOM])
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      results.forEach(d => d.resolve())
      assert.equal(await opened, true)
      assert.deepEqual(warned(), [`open ${ROOM}`, `check ${ROOM}`])
    })

    it("opening the chatroom joins the check's running sync, without a warning", async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(calls, [ROOM])
      let opened = false
      open().then((value) => { opened = value })
      await settle()
      assert.deepEqual(calls, [ROOM])
      assert.equal(opened, false)
      results[0].resolve()
      await settle()
      assert.equal(opened, true)
      assert.deepEqual(warned(), [`check ${ROOM}`])
    })

    it("opening the chatroom just after the check's sync succeeded doesn't sync again", async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      results[0].resolve()
      await settle()
      clock.advance(RECENT_SYNC_WINDOW - 1)
      assert.equal(await open(), false)
      assert.deepEqual(calls, [ROOM])
      assert.deepEqual(warned(), [`check ${ROOM}`])
    })

    it("opening the chatroom later, or after the check's sync failed, syncs again", async () => {
      for (const [failed, wait] of [[false, RECENT_SYNC_WINDOW], [true, 0]]) {
        logs.length = 0
        const { clock, calls, results, check, open } = setup()
        check()
        clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
        await settle()
        if (failed) results[0].reject(new Error('sync failed'))
        else results[0].resolve()
        await settle()
        clock.advance(wait)
        const opened = open()
        await settle()
        results[1]?.resolve()
        assert.equal(await opened, true)
        assert.deepEqual(calls, [ROOM, ROOM], `failed: ${String(failed)}`)
        assert.deepEqual(warned(), failed
          ? [`check ${ROOM}`, `sync error ${ROOM}`, `open ${ROOM}`]
          : [`check ${ROOM}`, `open ${ROOM}`])
      }
    })

    it('opening the chatroom twice in a row syncs once', async () => {
      const { clock, calls, results, open } = setup()
      const first = open()
      await settle()
      results[0].resolve()
      assert.equal(await first, true)
      clock.advance(RECENT_SYNC_WINDOW - 1)
      assert.equal(await open(), false)
      assert.deepEqual(calls, [ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`])
    })

    it('keeps the syncs of different chatrooms independent', async () => {
      const { clock, calls, results, check, open } = setup()
      check(ROOM, 10)
      check(OTHER, 4)
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      const opened = open(OTHER)
      await settle()
      clock.advance(100)
      await settle()
      results.forEach(d => d.resolve())
      assert.equal(await opened, true)
      assert.deepEqual(calls, [OTHER, ROOM])
      // `OTHER`'s check was covered by the sync of the opened chatroom
      assert.deepEqual(warned(), [`open ${OTHER}`, `check ${ROOM}`])
    })

    // ChatMain.vue passes neither `syncs` nor `now`. The chatroom is used by
    // no other test, since the module's map keeps its entry.
    it('shares the syncs of the two checks by default', async () => {
      const chatRoomID = 'zSharedByDefault'
      const clock = fakeClock()
      const calls = []
      const result = deferred()
      const sync = (id) => {
        calls.push(id)
        return result.promise
      }
      checkPublishedEventLater({ chatRoomID, height: 10, getLatestHeight: () => 9, isJoined: () => true, sync, timers: clock.timers, checks: new Map() })
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      const opened = resyncChatroomIfUnsubscribed({
        chatRoomID, getStatus: () => Promise.resolve(status('open', { missing: [chatRoomID] })), isJoined: () => true, sync, timers: clock.timers
      })
      await settle()
      result.resolve()
      assert.equal(await opened, true)
      assert.deepEqual(calls, [chatRoomID])
      assert.deepEqual(warned(), [`check ${chatRoomID}`])
    })

    it('opening the chatroom joins the newer sync after an older concurrent one settles', async () => {
      const { clock, calls, results, check, open } = setup()
      open()
      await settle()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      results[0].resolve()
      await settle()
      const opened = open()
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      results[1].resolve()
      assert.equal(await opened, true)
      assert.deepEqual(warned(), [`open ${ROOM}`, `check ${ROOM}`])
    })

    it('keeps the newest success when an older concurrent sync succeeds last', async () => {
      const { clock, calls, results, check, open } = setup()
      open()
      await settle()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY)
      await settle()
      results[1].resolve()
      await settle()
      results[0].resolve()
      await settle()
      clock.advance(RECENT_SYNC_WINDOW - 1)
      assert.equal(await open(), false)
      assert.deepEqual(calls, [ROOM, ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`, `check ${ROOM}`])
    })

    it('measures the window from the start of the sync', async () => {
      const { clock, calls, results, open } = setup()
      open()
      await settle()
      clock.advance(RECENT_SYNC_WINDOW - 500)
      results[0].resolve()
      await settle()
      clock.advance(1000)
      const opened = open()
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      results[1].resolve()
      assert.equal(await opened, true)
      assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`])
    })

    it('a newer sync keeps the earlier success for a check made before it', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      open()
      await settle()
      results[0].resolve()
      await settle()
      clock.advance(RECENT_SYNC_WINDOW)
      open()
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - RECENT_SYNC_WINDOW)
      await settle()
      // The check is done: it doesn't wait for the newer sync
      assert.equal(clock.pendingTimers(), 0)
      results[1].reject(new Error('sync failed'))
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`, `sync error ${ROOM}`])
    })

    // A tab's call to the service worker never settles if the service worker
    // is stopped while it answers
    it('opening the chatroom starts a new sync once a hung one is SHARED_SYNC_MAX_AGE old', async () => {
      const { clock, calls, results, open } = setup()
      open()
      await settle()
      clock.advance(SHARED_SYNC_MAX_AGE - 1)
      open()
      await settle()
      assert.deepEqual(calls, [ROOM])
      clock.advance(1)
      const opened = open()
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      results[1].resolve()
      assert.equal(await opened, true)
      assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`])
    })

    it('a check stops waiting for a hung sync once it is SHARED_SYNC_MAX_AGE old', async () => {
      const { clock, calls, results, check, open } = setup()
      check()
      clock.advance(PUBLISHED_EVENT_CHECK_DELAY - 100)
      open()
      await settle()
      clock.advance(100)
      await settle()
      assert.deepEqual(calls, [ROOM])
      clock.advance(SHARED_SYNC_MAX_AGE - 100 - 1)
      await settle()
      assert.deepEqual(calls, [ROOM])
      clock.advance(1)
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      // The check's own sync fails, then the hung one at last: the check
      // doesn't run again
      results[1].reject(new Error('sync failed'))
      await settle()
      results[0].reject(new Error('sync failed'))
      await settle()
      assert.deepEqual(calls, [ROOM, ROOM])
      assert.deepEqual(warned(), [`open ${ROOM}`, `check ${ROOM}`, `sync error ${ROOM}`, `sync error ${ROOM}`])
    })
  })
})
