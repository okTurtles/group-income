/* eslint-env mocha */
import assert from 'node:assert/strict'
import { REQUEST_TYPE } from '@chelonia/lib/pubsub'
import {
  CONNECTION_DEGRADED_GRACE,
  CONNECTION_TICK_INTERVAL,
  createConnectionMonitor,
  createPubsubHandlers,
  deriveState
} from './connectionMonitor.js'

const SOCKET = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }
const EVENTS = { OFFLINE: 'offline', ONLINE: 'online', RECONNECTING: 'reconnecting', RECONNECTION_FAILED: 'reconnection-failed' }

const fakeSocket = (readyState) => ({ ...SOCKET, readyState })

// Mirrors the `@chelonia/lib` 2.0.0 client fields the monitor reads
const fakeClient = ({ readyState = SOCKET.OPEN, subscribed = [], pending = [] } = {}) => {
  const client = {
    socket: readyState === null ? null : fakeSocket(readyState),
    shouldReconnect: true,
    nextConnectionAttemptDelayID: undefined,
    subscriptionSet: new Set(subscribed),
    pendingOperations: new Map(),
    setPending (ids) {
      if (ids.length) this.pendingOperations.set(REQUEST_TYPE.SUB, new Map(ids.map(id => [id, {}])))
      else this.pendingOperations.delete(REQUEST_TYPE.SUB)
    },
    pendingIDs () {
      return [...(this.pendingOperations.get(REQUEST_TYPE.SUB)?.keys() ?? [])]
    }
  }
  client.setPending(pending)
  return client
}

const fakeClock = () => {
  let time = 1_000_000
  let nextID = 1
  const queue = []
  const add = (fn, ms, every) => {
    const id = nextID++
    queue.push({ id, at: time + ms, fn, every })
    return id
  }
  const remove = (id) => {
    const index = queue.findIndex(timer => timer.id === id)
    if (index !== -1) queue.splice(index, 1)
  }
  const advance = (ms) => {
    const end = time + ms
    for (;;) {
      queue.sort((a, b) => a.at - b.at || a.id - b.id)
      const timer = queue[0]
      if (!timer || timer.at > end) break
      time = timer.at
      if (timer.every) timer.at += timer.every
      else queue.shift()
      timer.fn()
    }
    time = end
  }
  return {
    now: () => time,
    timers: {
      setTimeout: (fn, ms) => add(fn, ms),
      clearTimeout: remove,
      setInterval: (fn, ms) => add(fn, ms, ms),
      clearInterval: remove
    },
    advance,
    flush: () => advance(0),
    pendingTimers: () => queue.length
  }
}

// Requests every wanted contract that is neither subscribed nor pending, like
// `chelonia/pubsub/update`
const subscribeMissing = (t) => {
  const { client } = t.env
  const pending = client.pendingIDs()
  t.env.wanted.forEach(id => {
    if (!client.subscriptionSet.has(id) && !pending.includes(id)) pending.push(id)
  })
  client.setPending(pending)
}

const harness = ({ client = fakeClient(), wanted = [], onHeal = () => {}, libStatus = null, ...options } = {}) => {
  const clock = fakeClock()
  const env = { client, wanted, libStatus, online: true, pubsubCalls: 0 }
  const t = { clock, env, heals: [], emits: [] }
  t.monitor = createConnectionMonitor({
    getPubsub: () => {
      env.pubsubCalls++
      return typeof env.client === 'function' ? env.client() : env.client
    },
    getLibStatus: () => typeof env.libStatus === 'function' ? env.libStatus() : env.libStatus,
    isOnline: () => typeof env.online === 'function' ? env.online() : env.online,
    heal: () => {
      t.heals.push(clock.now())
      return onHeal(t)
    },
    emit: (status) => { t.emits.push(status) },
    now: clock.now,
    timers: clock.timers,
    ...options
  })
  t.monitor.setWanted(wanted)
  t.start = () => {
    t.startedAt = clock.now()
    t.monitor.start()
    clock.flush()
  }
  t.status = () => t.monitor.getStatus()
  return t
}

const silenceConsole = () => {
  const logs = []
  const original = {}
  beforeEach(() => {
    logs.length = 0
    for (const level of ['info', 'warn', 'error']) {
      original[level] = console[level]
      console[level] = (...args) => { logs.push({ level, args }) }
    }
  })
  afterEach(() => {
    Object.assign(console, original)
  })
  return logs
}

describe('connection monitor', () => {
  const logs = silenceConsole()
  const messages = () => logs.map(({ args }) => args.map(String).join(' '))

  describe('deriveState', () => {
    const online = () => true
    const offline = () => false

    it('follows the socket when it is open or connecting', () => {
      assert.equal(deriveState(fakeClient({ readyState: SOCKET.OPEN }), offline), 'open')
      assert.equal(deriveState(fakeClient({ readyState: SOCKET.CONNECTING }), offline), 'connecting')
      // Sockets without the constants
      assert.equal(deriveState({ socket: { readyState: 1 }, shouldReconnect: true }, online), 'open')
      assert.equal(deriveState({ socket: { readyState: 0 }, shouldReconnect: true }, online), 'connecting')
    })

    it('is closed without a client, or once the client stopped reconnecting', () => {
      assert.equal(deriveState(null, online), 'closed')
      const destroyed = fakeClient({ readyState: null })
      destroyed.shouldReconnect = false
      assert.equal(deriveState(destroyed, online), 'closed')
      assert.equal(deriveState(fakeClient({ readyState: null }), online), 'closed')
    })

    it('is offline when the device is offline', () => {
      assert.equal(deriveState(fakeClient({ readyState: SOCKET.CLOSING }), offline), 'offline')
      assert.equal(deriveState(fakeClient({ readyState: null }), offline), 'offline')
    })

    it('is reconnecting with a closing socket or a scheduled attempt', () => {
      assert.equal(deriveState(fakeClient({ readyState: SOCKET.CLOSING }), online), 'reconnecting')
      const scheduled = fakeClient({ readyState: null })
      scheduled.nextConnectionAttemptDelayID = 42
      assert.equal(deriveState(scheduled, online), 'reconnecting')
    })
  })

  it('reports a healthy, fully subscribed connection once', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a', 'b'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.advance(60e3)
    assert.equal(t.emits.length, 1)
    assert.deepEqual(t.heals, [])
    assert.deepEqual(t.status(), {
      at: t.clock.now(),
      source: 'app',
      state: 'open',
      since: t.startedAt,
      wanted: 2,
      missing: [],
      pending: [],
      oldestPendingSince: null,
      unsubscribedSince: null,
      degraded: false,
      heals: 0
    })
    assert.equal(t.emits.length, 1)
    assert.ok(messages().includes('[connection] open (wanted 2, missing 0, pending 0)'))
  })

  it("doesn't report the connection as back on the browser's online event (B3)", () => {
    const t = harness({ client: fakeClient({ readyState: SOCKET.CLOSING }), wanted: ['a'] })
    const events = []
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: (name) => events.push(name), events: EVENTS })
    t.env.online = false
    t.start()
    handlers.offline()
    t.clock.flush()
    assert.equal(t.status().state, 'offline')

    // The dead socket hasn't closed yet
    t.env.online = true
    handlers.online()
    t.clock.flush()
    assert.equal(t.status().state, 'reconnecting')

    // Closed, with an attempt scheduled
    t.env.client.socket = null
    t.env.client.nextConnectionAttemptDelayID = 7
    handlers.close()
    handlers['reconnection-scheduled']()
    t.clock.flush()
    assert.equal(t.status().state, 'reconnecting')
    assert.deepEqual(events, [EVENTS.OFFLINE])
    assert.deepEqual(t.emits.map(status => status.state), ['offline', 'reconnecting'])

    t.env.client.nextConnectionAttemptDelayID = undefined
    t.env.client.socket = fakeSocket(SOCKET.CONNECTING)
    handlers['reconnection-attempt']()
    t.clock.flush()
    assert.equal(t.status().state, 'connecting')

    t.env.client.socket.readyState = SOCKET.OPEN
    handlers['reconnection-succeeded']()
    t.clock.flush()
    assert.equal(t.status().state, 'open')
    assert.deepEqual(events, [EVENTS.OFFLINE, EVENTS.RECONNECTING, EVENTS.ONLINE])
  })

  it('reports a scheduled attempt without a socket as reconnecting (B4)', () => {
    const client = fakeClient({ readyState: null })
    client.nextConnectionAttemptDelayID = 3
    const t = harness({ client, wanted: ['a'] })
    t.start()
    assert.equal(t.emits[0].state, 'reconnecting')
    assert.equal(t.emits[0].degraded, false)
  })

  it('reports offline, and closed with everything missing without a client', () => {
    const t = harness({ client: fakeClient({ readyState: null }), wanted: ['a', 'b'] })
    t.env.online = false
    t.start()
    assert.equal(t.status().state, 'offline')

    t.env.client = null
    const status = t.status()
    assert.equal(status.state, 'closed')
    assert.equal(status.since, null)
    assert.deepEqual(status.missing, ['a', 'b'])
    assert.deepEqual(status.pending, [])
    assert.equal(status.degraded, false)
    t.clock.advance(60e3)
    assert.deepEqual(t.heals, [])
  })

  it('restarts `since` when the state or the client changes', () => {
    const t = harness({ client: fakeClient({ readyState: SOCKET.CONNECTING }) })
    t.start()
    assert.equal(t.status().since, t.startedAt)
    t.clock.advance(1000)
    t.env.client.socket.readyState = SOCKET.OPEN
    assert.equal(t.status().since, t.clock.now())
    t.clock.advance(1000)
    const openedAt = t.status().since
    t.clock.advance(1000)
    assert.equal(t.status().since, openedAt)
    t.env.client = fakeClient()
    assert.equal(t.status().since, t.clock.now())
  })

  it('heals a contract left unsubscribed after the grace period, backed off (B7)', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a', 'b'] }), wanted: ['a', 'b', 'c'] })
    t.start()
    let status = t.status()
    assert.equal(status.state, 'open')
    assert.deepEqual(status.missing, ['c'])
    assert.equal(status.unsubscribedSince, t.startedAt)
    assert.equal(status.degraded, false)

    t.clock.advance(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    assert.deepEqual(t.heals, [])

    // The server keeps rejecting the subscription: the heal changes nothing
    t.clock.advance(100e3)
    const at = (ms) => t.startedAt + ms
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3), at(80e3)])
    status = t.status()
    assert.equal(status.degraded, true)
    assert.equal(status.heals, 4)
    assert.deepEqual(t.emits.map(({ degraded, missing }) => [degraded, missing.length]), [[false, 1], [true, 1]])
    assert.ok(messages().includes('[connection] degraded: 1 missing, 0 pending for 10 s; re-subscribing'))
    assert.ok(messages().includes('[connection] still degraded: 1 missing, 0 pending for 20 s; re-subscribing (attempt 2)'))
    assert.ok(messages().every(message => !/\b[abc]\b/.test(message)), 'no contract IDs in the logs')

    // Subscribed at last
    t.env.client.subscriptionSet.add('c')
    createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {}, events: EVENTS })['subscription-succeeded']()
    t.clock.flush()
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 0)
    assert.equal(status.unsubscribedSince, null)
    assert.equal(t.emits.length, 3)
    assert.ok(messages().includes('[connection] subscriptions healthy again'))

    // A new episode starts without the previous backoff
    t.env.client.subscriptionSet.delete('c')
    const lostAt = t.clock.now()
    t.monitor.update()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 5)
    assert.ok(t.heals[4] - lostAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(t.heals[4] - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('reports a successful heal right away', () => {
    const t = harness({
      client: fakeClient({ subscribed: ['a'] }),
      wanted: ['a', 'b'],
      onHeal: subscribeMissing
    })
    t.start()
    t.clock.advance(CONNECTION_DEGRADED_GRACE)
    assert.equal(t.heals.length, 1)
    // Requested, waiting for the server
    t.clock.flush()
    let status = t.status()
    assert.deepEqual(status.missing, [])
    assert.deepEqual(status.pending, ['b'])
    assert.equal(status.degraded, true)
    assert.equal(t.emits.at(-1).pending.length, 1)

    t.env.client.setPending([])
    t.env.client.subscriptionSet.add('b')
    t.monitor.update()
    t.clock.flush()
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(t.heals.length, 1)
  })

  it("shows but doesn't heal pending-only degradation", () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'], pending: ['b'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    const status = t.status()
    assert.equal(status.degraded, true)
    assert.deepEqual(status.pending, ['b'])
    assert.equal(status.oldestPendingSince, t.startedAt)
    assert.deepEqual(t.heals, [])
    assert.ok(messages().includes('[connection] degraded: 0 missing, 1 pending for 10 s'))
  })

  it('restarts the grace period when the connection re-opens', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.advance(8e3)
    t.env.client.socket = null
    t.env.client.nextConnectionAttemptDelayID = 1
    t.monitor.update()
    t.clock.flush()
    let status = t.status()
    assert.equal(status.state, 'reconnecting')
    assert.equal(status.unsubscribedSince, null)
    assert.equal(status.degraded, false)

    t.clock.advance(5e3)
    t.env.client.nextConnectionAttemptDelayID = undefined
    t.env.client.socket = fakeSocket(SOCKET.OPEN)
    const openedAt = t.clock.now()
    t.monitor.update()
    t.clock.flush()
    assert.equal(t.status().unsubscribedSince, openedAt)
    t.clock.advance(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    t.clock.advance(1)
    status = t.status()
    assert.equal(status.degraded, true)
    assert.deepEqual(t.heals, [t.clock.now()])
  })

  it('re-subscribes after reconnecting, once the pending subscriptions are re-sent', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.advance(30e3)
    assert.equal(t.heals.length, 2)
    assert.equal(t.status().heals, 2)

    // Called from the `open` handler, before the pending subscriptions are re-sent
    t.monitor.onReconnected()
    assert.equal(t.heals.length, 2)
    t.clock.flush()
    assert.deepEqual(t.heals.slice(2), [t.clock.now()])
    const status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 0)
    assert.equal(status.unsubscribedSince, t.clock.now())

    // The backoff was reset
    const reconnectedAt = t.clock.now()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 4)
    assert.ok(t.heals[3] - reconnectedAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('re-subscribes from the reconnection handler and coalesces repeated calls', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    const events = []
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: (name) => events.push(name), events: EVENTS })
    t.start()
    handlers['reconnection-succeeded']()
    t.monitor.onReconnected()
    assert.deepEqual(events, [EVENTS.ONLINE])
    t.clock.flush()
    assert.equal(t.heals.length, 1)
  })

  it("doesn't re-subscribe after reconnecting without a client", () => {
    const t = harness({ client: null, wanted: ['a'] })
    t.start()
    t.monitor.onReconnected()
    t.clock.advance(60e3)
    assert.deepEqual(t.heals, [])
  })

  it("uses the library's status when it has the expected shape", () => {
    const libStatus = { state: 'open', since: 123, wanted: 3, missing: ['c'], pending: [], oldestPendingSince: null }
    const t = harness({ client: fakeClient({ readyState: SOCKET.CLOSING }), wanted: ['a'], libStatus })
    t.start()
    let status = t.status()
    assert.equal(status.source, 'chelonia')
    assert.equal(status.state, 'open')
    assert.equal(status.since, 123)
    assert.equal(status.wanted, 3)
    assert.deepEqual(status.missing, ['c'])
    t.clock.advance(CONNECTION_DEGRADED_GRACE)
    status = t.status()
    assert.equal(status.degraded, true)
    assert.equal(t.heals.length, 1)

    for (const invalid of [
      null,
      'open',
      { state: 'open', missing: 'c', pending: [] },
      { state: 'open', missing: [] },
      { state: 'unknown', missing: [], pending: [] }
    ]) {
      t.env.libStatus = invalid
      status = t.status()
      assert.equal(status.source, 'app', JSON.stringify(invalid))
      assert.equal(status.state, 'reconnecting')
      assert.equal(status.wanted, 1)
    }

    t.env.libStatus = { state: 'offline', since: null, missing: [], pending: ['a', 7] }
    status = t.status()
    assert.equal(status.source, 'chelonia')
    assert.equal(status.wanted, 1)
    assert.deepEqual(status.pending, ['a'])
  })

  it('never throws, whatever its dependencies do', () => {
    const fail = () => { throw new Error('boom') }
    const t = harness({ client: fakeClient(), wanted: ['a'], onHeal: fail })
    t.env.libStatus = fail
    t.env.online = fail
    t.start()
    t.clock.advance(60e3)
    assert.ok(t.heals.length > 0)
    assert.equal(t.status().source, 'app')

    t.env.client = fail
    assert.doesNotThrow(() => t.status())
    assert.equal(t.status().state, 'closed')
    assert.doesNotThrow(() => {
      t.monitor.update()
      t.monitor.onReconnected()
      t.monitor.setWanted(undefined)
      t.clock.advance(60e3)
    })

    // Rejected heals are logged
    const rejecting = harness({ client: fakeClient(), wanted: ['a'], onHeal: () => Promise.reject(new Error('rejected')) })
    rejecting.start()
    rejecting.monitor.onReconnected()
    rejecting.clock.flush()
    assert.equal(rejecting.heals.length, 1)

    const throwingEmit = createConnectionMonitor({
      getPubsub: () => fakeClient(),
      getLibStatus: () => null,
      isOnline: () => true,
      heal: () => {},
      emit: fail
    })
    assert.equal(throwingEmit.getStatus().state, 'open')

    const brokenTimers = createConnectionMonitor({
      getPubsub: () => fakeClient(),
      getLibStatus: () => null,
      isOnline: () => true,
      heal: () => {},
      emit: () => {},
      timers: { setTimeout: fail, clearTimeout: fail, setInterval: fail, clearInterval: fail }
    })
    assert.doesNotThrow(() => {
      brokenTimers.start()
      brokenTimers.update()
      brokenTimers.onReconnected()
      brokenTimers.stop()
    })

    const throwingMonitor = { update: fail, onReconnected: fail }
    const handlers = createPubsubHandlers({ monitor: throwingMonitor, emitEvent: fail, events: EVENTS })
    for (const [name, handler] of Object.entries(handlers)) {
      assert.doesNotThrow(() => handler(), name)
    }

    // A failing step doesn't prevent the next ones
    const calls = []
    const monitor = { update: () => calls.push('update'), onReconnected: () => calls.push('onReconnected') }
    const partial = createPubsubHandlers({ monitor, emitEvent: fail, events: EVENTS })
    partial.offline()
    partial['reconnection-succeeded']()
    assert.deepEqual(calls, ['update', 'onReconnected'])
    return Promise.resolve().then(() => {
      assert.ok(messages().some(message => message.includes('rejected')))
    })
  })

  it('has nothing missing once nothing is wanted (logout, chelonia/reset)', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.advance(CONNECTION_DEGRADED_GRACE)
    assert.equal(t.status().degraded, true)
    t.monitor.setWanted([])
    t.clock.flush()
    const status = t.status()
    assert.equal(status.wanted, 0)
    assert.deepEqual(status.missing, [])
    assert.equal(status.degraded, false)
    assert.equal(t.emits.at(-1).degraded, false)

    t.monitor.setWanted(['a', 'a', 42, 'b'])
    assert.equal(t.status().wanted, 2)
  })

  it('recomputes once for a burst of updates', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a'] })
    t.clock.flush()
    t.env.pubsubCalls = 0
    t.emits.length = 0
    t.env.client.socket.readyState = SOCKET.CLOSING
    for (let i = 0; i < 100; i++) t.monitor.update()
    t.clock.flush()
    assert.equal(t.env.pubsubCalls, 1)
    assert.equal(t.emits.length, 1)
  })

  it('stops its timers', () => {
    const t = harness({ client: fakeClient(), wanted: ['a'] })
    t.start()
    t.monitor.onReconnected()
    t.monitor.update()
    t.monitor.stop()
    assert.equal(t.clock.pendingTimers(), 0)
    t.monitor.start()
    t.monitor.start()
    assert.equal(t.clock.pendingTimers(), 2)
  })
})
