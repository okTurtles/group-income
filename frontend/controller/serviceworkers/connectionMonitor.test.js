/* eslint-env mocha */
import assert from 'node:assert/strict'
import { REQUEST_TYPE } from '@chelonia/lib/pubsub'
import { connectionStatus } from '../../../test/unit-helpers/connectionStatus.js'
import { fakeClock } from '../../../test/unit-helpers/fakeClock.js'
import { silenceConsole } from '../../../test/unit-helpers/utils.js'
import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../../utils/events.js'
import {
  CONNECTION_DEGRADED_GRACE,
  CONNECTION_MAX_DEGRADED_HEALS,
  CONNECTION_TICK_INTERVAL,
  createConnectionMonitor,
  createPubsubHandlers,
  deriveState
} from './connectionMonitor.js'

const SOCKET = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }

const fakeSocket = (readyState) => ({ ...SOCKET, readyState })

// Mirrors the `@chelonia/lib` 2.0.0 client fields the monitor reads
const fakeClient = ({ readyState = SOCKET.OPEN, subscribed = [], pending = [] } = {}) => {
  const client = {
    socket: readyState === null ? null : fakeSocket(readyState),
    shouldReconnect: true,
    nextConnectionAttemptDelayID: undefined,
    subscriptionSet: new Set(subscribed),
    pendingOperations: new Map(),
    // Every subscription request, in order, so that a test can tell when a
    // contract is requested twice
    sent: [],
    setPending (ids) {
      if (ids.length) this.pendingOperations.set(REQUEST_TYPE.SUB, new Map(ids.map(id => [id, {}])))
      else this.pendingOperations.delete(REQUEST_TYPE.SUB)
    },
    pendingIDs () {
      return [...(this.pendingOperations.get(REQUEST_TYPE.SUB)?.keys() ?? [])]
    },
    // Like the 2.0.0 client when the server confirms a subscription
    ack (id) {
      this.setPending(this.pendingIDs().filter(pending => pending !== id))
      this.subscriptionSet.add(id)
    }
  }
  client.setPending(pending)
  return client
}

// Requests every wanted contract that is neither subscribed nor pending, like
// `chelonia/pubsub/update` (2.0.0's `sub()` skips the others)
const subscribeMissing = (t) => {
  const { client } = t.env
  const pending = client.pendingIDs()
  t.env.wanted.forEach(id => {
    if (!client.subscriptionSet.has(id) && !pending.includes(id)) {
      pending.push(id)
      client.sent.push(id)
    }
  })
  client.setPending(pending)
}

// Like the 2.0.0 client's `close` handler: the subscriptions become pending
// again, to be re-sent once the socket re-opens
const closeSocket = (client) => {
  client.setPending([...client.pendingIDs(), ...client.subscriptionSet])
  client.subscriptionSet.clear()
  client.socket = null
  client.nextConnectionAttemptDelayID = 1
}

// Like its `open` handler: `reconnection-succeeded` first, then the pending
// subscriptions are re-sent
const openSocket = (client, handlers) => {
  client.nextConnectionAttemptDelayID = undefined
  client.socket = fakeSocket(SOCKET.OPEN)
  handlers['reconnection-succeeded']()
  client.sent.push(...client.pendingIDs())
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
    // Also checks that the helper used by the tabs' tests has the same fields
    assert.deepEqual(t.status(), connectionStatus('open', { at: t.clock.now(), since: t.startedAt, wanted: 2 }))
    assert.equal(t.emits.length, 1)
    assert.ok(messages().includes('[connection] open (wanted 2, missing 0, pending 0)'))
  })

  it("doesn't report the connection as back on the browser's online event", () => {
    const t = harness({ client: fakeClient({ readyState: SOCKET.CLOSING }), wanted: ['a'] })
    const events = []
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: (name) => events.push(name) })
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
    assert.deepEqual(events, [OFFLINE])
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
    assert.deepEqual(events, [OFFLINE, RECONNECTING, ONLINE])
  })

  it('reports a scheduled attempt without a socket as reconnecting', () => {
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

  it('heals a contract left unsubscribed after the grace period, backed off', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2', 'zC3'] })
    const refused = `[connection] 1 subscription(s) still refused after ${CONNECTION_MAX_DEGRADED_HEALS} attempts; no longer reported as degraded, still re-subscribing`
    t.start()
    let status = t.status()
    assert.equal(status.state, 'open')
    assert.deepEqual(status.missing, ['zC3'])
    assert.equal(status.unsubscribedSince, t.startedAt)
    assert.equal(status.degraded, false)

    t.clock.advance(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    assert.deepEqual(t.heals, [])

    // The server keeps refusing the subscription: the heals change nothing
    const at = (ms) => t.startedAt + ms
    t.clock.advance(at(40e3) - t.clock.now())
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3)])
    status = t.status()
    assert.equal(status.degraded, false)
    assert.deepEqual(status.missing, ['zC3'])
    assert.equal(status.unsubscribedSince, t.startedAt)
    assert.equal(status.heals, 3)

    // Still requested, backed off, but no longer reported as degraded
    t.clock.advance(60e3)
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3), at(80e3)])
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 4)
    assert.deepEqual(t.emits.map(({ degraded, missing }) => [degraded, missing.length]), [[false, 1], [true, 1], [false, 1]])
    assert.equal(t.emits[2].at, at(40e3))
    assert.ok(messages().includes('[connection] degraded: 1 missing, 0 pending for 10 s; re-subscribing'))
    assert.ok(messages().includes('[connection] still degraded: 1 missing, 0 pending for 20 s; re-subscribing (attempt 2)'))
    assert.equal(messages().filter(message => message === refused).length, 1)
    assert.ok(!messages().includes('[connection] subscriptions healthy again'))
    assert.ok(messages().every(message => !/z[ABC]\d/.test(message)), 'no contract IDs in the logs')

    // Subscribed at last
    t.env.client.subscriptionSet.add('zC3')
    createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {} })['subscription-succeeded']()
    t.clock.flush()
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 0)
    assert.equal(status.unsubscribedSince, null)
    assert.equal(t.emits.length, 4)
    assert.ok(messages().includes('[connection] subscriptions healthy again'))

    // Counted again once it was subscribed: a new episode starts without the
    // previous backoff
    t.env.client.subscriptionSet.delete('zC3')
    const lostAt = t.clock.now()
    t.monitor.update()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.status().degraded, true)
    assert.equal(t.heals.length, 5)
    assert.ok(t.heals[4] - lostAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(t.heals[4] - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('heals a newly lost contract promptly while another is refused', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2', 'zC3'] })
    t.start()
    // `zC3` was given up at 40 s
    t.clock.advance(100e3)
    assert.equal(t.status().degraded, false)
    assert.equal(t.heals.length, 4)
    assert.equal(t.status().heals, 4)

    t.env.client.subscriptionSet.delete('zB2')
    const lostAt = t.clock.now()
    t.monitor.update()
    t.clock.advance(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    assert.equal(t.heals.length, 4)

    // Not after `zC3`'s backoff (160 s)
    t.clock.advance(CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 5)
    const firstHeal = t.heals[4]
    assert.ok(firstHeal - lostAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(firstHeal - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    const status = t.status()
    assert.equal(status.degraded, true)
    assert.deepEqual(status.missing, ['zB2', 'zC3'])
    assert.equal(status.heals, 1)

    // Degraded until `zB2`'s third request
    t.clock.advance(60e3)
    assert.deepEqual(t.heals.slice(4), [firstHeal, firstHeal + 10e3, firstHeal + 30e3])
    assert.deepEqual(
      t.emits.slice(3).map(({ at, degraded, missing }) => [at, degraded, missing.length]),
      [[lostAt, false, 2], [firstHeal, true, 2], [firstHeal + 30e3, false, 2]]
    )
    assert.equal(t.status().degraded, false)
  })

  it('counts a refused contract again once it was no longer wanted', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zC3'] })
    t.start()
    t.clock.advance(60e3)
    assert.equal(t.status().degraded, false)

    // Unwanted, then wanted again, while the connection is down (e.g., a
    // logout and a login)
    t.env.client.socket = null
    t.env.client.nextConnectionAttemptDelayID = 1
    t.monitor.update()
    t.clock.flush()
    t.monitor.setWanted(['zA1'])
    t.clock.flush()
    t.monitor.setWanted(['zA1', 'zC3'])
    t.clock.flush()

    t.env.client.nextConnectionAttemptDelayID = undefined
    t.env.client.socket = fakeSocket(SOCKET.OPEN)
    t.monitor.update()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.status().degraded, true)
  })

  it('caps the re-subscription backoff', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zB2'], maxHealDelay: 25e3 })
    t.start()
    t.clock.advance(100e3)
    const at = (ms) => t.startedAt + ms
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3), at(65e3), at(90e3)])
  })

  it('answers status queries without re-subscribing, logging or broadcasting', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2'] })
    t.start()
    // The grace period ends between two ticks
    t.clock.advance(CONNECTION_TICK_INTERVAL / 2)
    t.env.client.subscriptionSet.delete('zB2')
    const lostAt = t.clock.now()
    t.monitor.update()
    t.clock.advance(CONNECTION_DEGRADED_GRACE + 500)

    const emits = t.emits.length
    const logged = logs.length
    for (let i = 0; i < 3; i++) {
      const status = t.status()
      assert.equal(status.degraded, true)
      assert.equal(status.heals, 0)
    }
    assert.deepEqual(t.heals, [])
    assert.equal(t.emits.length, emits)
    assert.equal(logs.length, logged)
    assert.equal(t.clock.pendingTimers(), 1)

    t.clock.advance(CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 1)
    assert.ok(t.heals[0] - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
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

  it('reports a successful heal right away, even when broadcasting fails', () => {
    const emitted = []
    const t = harness({
      client: fakeClient({ subscribed: ['a'] }),
      wanted: ['a', 'b'],
      onHeal: ({ env }) => { env.client.subscriptionSet.add('b') },
      emit: (status) => {
        emitted.push(status)
        if (status.degraded) throw new Error('boom')
      }
    })
    t.start()
    t.clock.advance(CONNECTION_DEGRADED_GRACE)
    t.clock.flush()
    const healedAt = t.startedAt + CONNECTION_DEGRADED_GRACE
    // Broadcast by the recompute that follows the heal, not by the next tick
    assert.deepEqual(emitted.map(({ at, degraded }) => [at, degraded]), [[t.startedAt, false], [healedAt, true], [healedAt, false]])
    assert.ok(messages().some(message => message.startsWith('[connection] Error emitting the connection status')))
    assert.ok(!messages().some(message => message.startsWith('[connection] Error computing the connection status')))
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
    // Queries don't heal: the next tick does
    assert.deepEqual(t.heals, [])
    t.clock.advance(CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 1)
    assert.ok(t.heals[0] - openedAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('reports how long a re-sent subscription request has been pending, not since the disconnection', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1'] })
    t.start()
    // The 2.0.0 client marks the subscribed contracts as pending when the
    // socket closes
    t.env.client.socket = null
    t.env.client.nextConnectionAttemptDelayID = 1
    t.env.client.subscriptionSet.delete('zA1')
    t.env.client.setPending(['zA1'])
    t.monitor.update()
    t.clock.flush()
    let status = t.status()
    assert.equal(status.state, 'reconnecting')
    assert.deepEqual(status.pending, ['zA1'])
    assert.equal(status.oldestPendingSince, null)

    // It re-sends the request once the socket re-opens
    t.clock.advance(3e3)
    t.env.client.nextConnectionAttemptDelayID = undefined
    t.env.client.socket = fakeSocket(SOCKET.OPEN)
    const reopenedAt = t.clock.now()
    t.monitor.update()
    t.clock.flush()
    t.clock.advance(500)
    status = t.status()
    assert.equal(status.state, 'open')
    assert.deepEqual(status.pending, ['zA1'])
    assert.equal(status.oldestPendingSince, reopenedAt)
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
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: (name) => events.push(name) })
    t.start()
    handlers['reconnection-succeeded']()
    t.monitor.onReconnected()
    assert.deepEqual(events, [ONLINE])
    t.clock.flush()
    assert.equal(t.heals.length, 1)
  })

  it('requests a contract given up before a reconnection once, after the subscriptions it had', () => {
    const t = harness({
      client: fakeClient({ subscribed: ['zA1', 'zB2'] }),
      wanted: ['zA1', 'zB2', 'zC3'],
      onHeal: subscribeMissing
    })
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {} })
    // `zC3` was refused: neither subscribed nor pending
    t.start()
    const { client } = t.env
    closeSocket(client)
    handlers.close()
    t.clock.flush()

    openSocket(client, handlers)
    assert.deepEqual(client.sent, ['zA1', 'zB2'])
    t.clock.flush()
    assert.deepEqual(client.sent, ['zA1', 'zB2', 'zC3'])
    assert.equal(t.heals.length, 1)
  })

  it('maps each pubsub event to the legacy event and the monitor call', () => {
    const calls = []
    const monitor = { update: () => calls.push('update'), onReconnected: () => calls.push('onReconnected') }
    const handlers = createPubsubHandlers({ monitor, emitEvent: (name) => calls.push(name) })
    const expected = {
      offline: [OFFLINE, 'update'],
      online: ['update'],
      'reconnection-attempt': [RECONNECTING, 'update'],
      'reconnection-scheduled': ['update'],
      'reconnection-failed': [RECONNECTION_FAILED, 'update'],
      'reconnection-succeeded': [ONLINE, 'onReconnected'],
      close: ['update'],
      'subscription-succeeded': ['update']
    }
    assert.deepEqual(Object.keys(handlers).sort(), Object.keys(expected).sort())
    for (const [name, steps] of Object.entries(expected)) {
      calls.length = 0
      handlers[name]()
      assert.deepEqual(calls, steps, name)
    }
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
      brokenTimers.start()
    })

    // Without a previous status, the fallback uses the injected clock
    const clock = fakeClock()
    const unreadable = createConnectionMonitor({
      getPubsub: () => ({ get socket () { throw new Error('unreadable') } }),
      getLibStatus: fail,
      isOnline: () => true,
      heal: () => {},
      emit: () => {},
      now: clock.now,
      timers: clock.timers
    })
    clock.advance(1234)
    const fallback = unreadable.getStatus()
    assert.equal(fallback.at, clock.now())
    assert.equal(fallback.state, 'closed')

    const throwingMonitor = { update: fail, onReconnected: fail }
    const handlers = createPubsubHandlers({ monitor: throwingMonitor, emitEvent: fail })
    for (const [name, handler] of Object.entries(handlers)) {
      assert.doesNotThrow(() => handler(), name)
    }

    // A failing step doesn't prevent the next ones
    const calls = []
    const monitor = { update: () => calls.push('update'), onReconnected: () => calls.push('onReconnected') }
    const partial = createPubsubHandlers({ monitor, emitEvent: fail })
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

  it('starts its periodic check once', () => {
    const t = harness({ client: fakeClient(), wanted: ['zA1'] })
    t.monitor.start()
    t.monitor.start()
    // The interval and one coalesced update
    assert.equal(t.clock.pendingTimers(), 2)
    t.clock.flush()
    assert.equal(t.clock.pendingTimers(), 1)
  })
})
