/* eslint-env mocha */
import assert from 'node:assert/strict'
import {
  CONNECTION_STATUS_TIMEOUT,
  SENT_MESSAGE_CHECK_DELAY,
  checkSentMessageLater,
  isChatroomUnsubscribed,
  isHeightProcessed,
  resyncChatroomIfUnsubscribed
} from './chatroomResync.js'

const ROOM = 'zChatroom'
const OTHER = 'zOther'

const fakeTimers = () => {
  let nextID = 1
  const queue = []
  let time = 0
  const advance = (ms) => {
    const end = time + ms
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.id - b.id)
      const timer = queue[0]
      if (!timer || timer.at > end) break
      time = timer.at
      queue.shift()
      timer.fn()
    }
    time = end
  }
  return {
    timers: {
      setTimeout: (fn, ms) => {
        const id = nextID++
        queue.push({ id, at: time + ms, fn })
        return id
      },
      clearTimeout: (id) => {
        const index = queue.findIndex(timer => timer.id === id)
        if (index !== -1) queue.splice(index, 1)
      }
    },
    advance,
    pendingTimers: () => queue.length
  }
}

// Lets the promise callbacks run
const settle = () => new Promise(resolve => setImmediate(resolve))

// A status from `sw/connection/status` (see `ConnectionStatus`)
const status = (state, { missing = [], pending = [], degraded = false } = {}) => ({
  at: 1,
  source: 'app',
  state,
  since: 1,
  wanted: 3,
  missing,
  pending,
  oldestPendingSince: pending.length ? 1 : null,
  unsubscribedSince: missing.length || pending.length ? 1 : null,
  degraded,
  heals: 0
})

const syncSpy = (impl = () => Promise.resolve()) => {
  const calls = []
  const sync = (id) => {
    calls.push(id)
    return impl(id)
  }
  return { sync, calls }
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
      const clock = fakeTimers()
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
      const rejecting = run({ getStatus: () => Promise.reject(new Error('SBP: selector not registered: sw/connection/status')) })
      assert.equal(await rejecting.promise, false)
      assert.deepEqual(rejecting.spy.calls, [])
      assert.equal(rejecting.clock.pendingTimers(), 0)

      const throwing = run({ getStatus: () => { throw new Error('boom') } })
      assert.equal(await throwing.promise, false)
      assert.deepEqual(throwing.spy.calls, [])
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
      assert.equal(warnings.length, 4)
    })
  })

  describe('checkSentMessageLater', () => {
    const run = (overrides = {}) => {
      const clock = fakeTimers()
      const spy = syncSpy(overrides.syncImpl)
      const state = { latestHeight: 9, joined: true }
      const cancel = checkSentMessageLater({
        chatRoomID: ROOM,
        height: 10,
        getLatestHeight: () => state.latestHeight,
        isJoined: () => state.joined,
        sync: spy.sync,
        timers: clock.timers,
        ...overrides
      })
      return { clock, spy, state, cancel }
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

    it('can be cancelled', async () => {
      const { clock, spy, cancel } = run()
      cancel()
      assert.equal(clock.pendingTimers(), 0)
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
  })
})
