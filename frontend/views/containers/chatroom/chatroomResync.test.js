/* eslint-env mocha */
import assert from 'node:assert/strict'
import { fakeClock } from '../../../../test/unit-helpers/fakeClock.js'
import { connectionStatus } from '../../../../test/unit-helpers/connectionStatus.js'
import { deferred, settle, silenceConsole } from '../../../../test/unit-helpers/utils.js'
import { CONNECTION_STATUS_TIMEOUT } from '../../../controller/connectionStatus.js'
import {
  RECENT_SYNC_WINDOW,
  SHARED_SYNC_MAX_AGE,
  isChatroomUnsubscribed,
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

// A selector dispatcher (`sbp`) with the app's selectors that the check uses.
// Records the selectors called, and the calls of `isJoinedChatRoom`.
const appSelectors = ({ joined = true, connection = status('open', { missing: [ROOM] }) } = {}) => {
  const calls = []
  const selectors = {
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

  describe('resyncChatroomIfUnsubscribed', () => {
    // `open()` opens a chatroom that the status shows as missing. All its
    // calls share the clock, the sync spy and the syncs.
    const setup = ({ syncImpl, ...overrides } = {}) => {
      const clock = fakeClock()
      const spy = syncSpy(syncImpl)
      const syncs = new Map()
      const open = (chatRoomID = ROOM) => resyncChatroomIfUnsubscribed({
        chatRoomID,
        getStatus: () => Promise.resolve(status('open', { missing: [chatRoomID] })),
        isJoined: () => true,
        sync: spy.sync,
        timers: clock.timers,
        syncs,
        now: clock.now,
        ...overrides
      })
      return { clock, spy, open }
    }

    const run = (options) => {
      const test = setup(options)
      return { ...test, promise: test.open() }
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
      assert.equal(await rejecting.promise, false)
      const throwing = run({ syncImpl: () => { throw new Error('sync threw') } })
      assert.equal(await throwing.promise, false)
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
    describe('opening a chatroom again', () => {
      // Each sync settles when the test says so
      const controlled = () => {
        const results = []
        const test = setup({
          syncImpl: () => {
            const d = deferred()
            results.push(d)
            return d.promise
          }
        })
        return { ...test, calls: test.spy.calls, results }
      }

      // What each warning was about, in order
      const warned = () => warnings().map(([text, chatRoomID]) => {
        const kind = text.includes('not subscribed') ? 'open' : text.includes('Error re-syncing') ? 'sync error' : text
        return `${kind} ${chatRoomID}`
      })

      it('joins the running sync, without a warning', async () => {
        const { calls, results, open } = controlled()
        const first = open()
        await settle()
        const second = open()
        await settle()
        assert.deepEqual(calls, [ROOM])
        results[0].resolve()
        assert.equal(await first, true)
        assert.equal(await second, true)
        assert.deepEqual(warned(), [`open ${ROOM}`])
      })

      it('resolves to false when the sync it joined fails', async () => {
        const { calls, results, open } = controlled()
        const first = open()
        await settle()
        const second = open()
        await settle()
        results[0].reject(new Error('sync failed'))
        assert.equal(await first, false)
        assert.equal(await second, false)
        assert.deepEqual(calls, [ROOM])
        assert.deepEqual(warned(), [`open ${ROOM}`, `sync error ${ROOM}`])
      })

      it('makes no sync just after one succeeded', async () => {
        const { clock, calls, results, open } = controlled()
        const first = open()
        await settle()
        results[0].resolve()
        assert.equal(await first, true)
        clock.advance(RECENT_SYNC_WINDOW - 1)
        assert.equal(await open(), false)
        assert.deepEqual(calls, [ROOM])
        assert.deepEqual(warned(), [`open ${ROOM}`])
      })

      it('syncs again later', async () => {
        const { clock, calls, results, open } = controlled()
        const first = open()
        await settle()
        results[0].resolve()
        assert.equal(await first, true)
        clock.advance(RECENT_SYNC_WINDOW)
        const second = open()
        await settle()
        results[1].resolve()
        assert.equal(await second, true)
        assert.deepEqual(calls, [ROOM, ROOM])
        assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`])
      })

      it('syncs again right after a sync failed', async () => {
        const { calls, results, open } = controlled()
        const first = open()
        await settle()
        results[0].reject(new Error('sync failed'))
        assert.equal(await first, false)
        const second = open()
        await settle()
        results[1].resolve()
        assert.equal(await second, true)
        assert.deepEqual(calls, [ROOM, ROOM])
        assert.deepEqual(warned(), [`open ${ROOM}`, `sync error ${ROOM}`, `open ${ROOM}`])
      })

      it('measures the window from the start of the sync', async () => {
        const { clock, calls, results, open } = controlled()
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

      it('keeps the syncs of different chatrooms independent', async () => {
        const { calls, results, open } = controlled()
        const opened = [open(ROOM), open(OTHER)]
        await settle()
        assert.deepEqual(calls, [ROOM, OTHER])
        results.forEach(d => d.resolve())
        assert.deepEqual(await Promise.all(opened), [true, true])
        assert.deepEqual(warned(), [`open ${ROOM}`, `open ${OTHER}`])
      })

      // A tab's call to the service worker never settles if the service worker
      // is stopped while it answers
      it('starts a new sync once a hung one is SHARED_SYNC_MAX_AGE old', async () => {
        const { clock, calls, results, open } = controlled()
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

      it('joins the newer sync after an older hung one settles', async () => {
        const { clock, calls, results, open } = controlled()
        open()
        await settle()
        clock.advance(SHARED_SYNC_MAX_AGE)
        open()
        await settle()
        results[0].resolve()
        await settle()
        const opened = open()
        await settle()
        assert.deepEqual(calls, [ROOM, ROOM])
        results[1].resolve()
        assert.equal(await opened, true)
        assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`])
      })

      it('keeps the newest success when an older hung sync succeeds last', async () => {
        const { clock, calls, results, open } = controlled()
        open()
        await settle()
        clock.advance(SHARED_SYNC_MAX_AGE)
        open()
        await settle()
        results[1].resolve()
        await settle()
        results[0].resolve()
        await settle()
        clock.advance(RECENT_SYNC_WINDOW - 1)
        assert.equal(await open(), false)
        assert.deepEqual(calls, [ROOM, ROOM])
        assert.deepEqual(warned(), [`open ${ROOM}`, `open ${ROOM}`])
      })

      // ChatMain.vue passes neither `syncs` nor `now`. The chatroom is used by
      // no other test, since the module's map keeps its entry.
      it("shares the module's syncs by default", async () => {
        const chatRoomID = 'zSharedByDefault'
        const clock = fakeClock()
        const result = deferred()
        const spy = syncSpy(() => result.promise)
        const open = () => resyncChatroomIfUnsubscribed({
          chatRoomID, getStatus: () => Promise.resolve(status('open', { missing: [chatRoomID] })), isJoined: () => true, sync: spy.sync, timers: clock.timers
        })
        const opened = [open(), open()]
        await settle()
        result.resolve()
        assert.deepEqual(await Promise.all(opened), [true, true])
        assert.deepEqual(spy.calls, [chatRoomID])
        assert.deepEqual(warned(), [`open ${chatRoomID}`])
      })
    })
  })
})
