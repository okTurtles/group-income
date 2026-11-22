/* eslint-env mocha */
import assert from 'node:assert/strict'
import sinon from 'sinon'
import { connectionStatus } from '../../../test/unit-helpers/connectionStatus.js'
import { fakeTimers, settle, silenceConsole } from '../../../test/unit-helpers/utils.js'
import { OFFLINE, ONLINE, RECONNECTING, RECONNECTION_FAILED } from '../../utils/events.js'
import {
  CONNECTION_DEGRADED_GRACE,
  CONNECTION_MAX_DEGRADED_HEALS,
  CONNECTION_TICK_INTERVAL,
  createConnectionMonitor,
  createPubsubHandlers
} from './connectionMonitor.js'

// The pubsub client fields that `chelonia/pubsub/status` reads (through
// `client.getStatus()` in `@chelonia/lib` 2.2.0). `since` is set by the
// harness, and `pendingSince` holds when each pending subscription was sent.
const fakeClient = ({ state = 'open', subscribed = [], pending = [] } = {}) => ({
  state,
  since: undefined,
  subscriptionSet: new Set(subscribed),
  pendingSince: new Map(pending.map(id => [id, undefined])),
  // Every subscription request, in order, so that a test can tell when a
  // contract is requested twice
  sent: [],
  setState (state, at) {
    this.state = state
    this.since = at
  },
  // Like the client when the server confirms a subscription
  ack (id) {
    this.pendingSince.delete(id)
    this.subscriptionSet.add(id)
  }
})

// `chelonia/pubsub/status` in `@chelonia/lib` 2.2.0, with `wanted` as
// Chelonia's subscription set
const libStatus = (client, wanted) => {
  if (!client) {
    return { state: 'closed', since: null, wanted: wanted.length, missing: wanted.slice(), pending: [], oldestPendingSince: null }
  }
  const pending = wanted.filter(id => client.pendingSince.has(id))
  const sent = pending.map(id => client.pendingSince.get(id)).filter(at => at !== undefined)
  return {
    state: client.state,
    since: client.since,
    wanted: wanted.length,
    missing: wanted.filter(id => !client.subscriptionSet.has(id) && !client.pendingSince.has(id)),
    pending,
    oldestPendingSince: sent.length ? Math.min(...sent) : null
  }
}

// Requests every wanted contract that is neither subscribed nor pending, like
// `chelonia/pubsub/update` (`sub()` skips the others)
const subscribeMissing = (t) => {
  const { client } = t.env
  t.env.wanted.forEach(id => {
    if (!client.subscriptionSet.has(id) && !client.pendingSince.has(id)) {
      client.pendingSince.set(id, t.clock.now)
      client.sent.push(id)
    }
  })
}

// Like the client's `close` handler: the subscriptions become pending again,
// to be re-sent once the socket re-opens
const closeSocket = (t) => {
  const { client } = t.env
  for (const id of client.subscriptionSet) client.pendingSince.set(id, undefined)
  client.subscriptionSet.clear()
  client.setState('reconnecting', t.clock.now)
}

// Like its `open` handler: `reconnection-succeeded` first, then the pending
// subscriptions are re-sent
const openSocket = (t, handlers) => {
  const { client } = t.env
  client.setState('open', t.clock.now)
  handlers['reconnection-succeeded']()
  for (const id of client.pendingSince.keys()) {
    client.pendingSince.set(id, t.clock.now)
    client.sent.push(id)
  }
}

// `wanted: null`: nothing wanted yet, as when the service worker starts
const harness = ({ client = fakeClient(), wanted = [], onHeal = () => {}, ...options } = {}) => {
  if (client) {
    client.since ??= clock.now
    for (const [id, at] of client.pendingSince) client.pendingSince.set(id, at ?? clock.now)
  }
  const env = { client, wanted: wanted ?? [], libStatusCalls: 0 }
  const t = { clock, env, heals: [], emits: [] }
  t.monitor = createConnectionMonitor({
    getLibStatus: () => {
      env.libStatusCalls++
      return libStatus(typeof env.client === 'function' ? env.client() : env.client, env.wanted)
    },
    heal: () => {
      t.heals.push(clock.now)
      return onHeal(t)
    },
    emit: (status) => { t.emits.push(status) },
    now: () => clock.now,
    ...options
  })
  t.setWanted = (ids) => {
    env.wanted = ids
    t.monitor.setWanted(ids)
  }
  if (wanted !== null) t.setWanted(wanted)
  t.start = () => {
    t.startedAt = clock.now
    t.monitor.start()
    clock.tick(0)
  }
  t.status = () => t.monitor.getStatus()
  return t
}

let clock

describe('connection monitor', () => {
  beforeEach(() => { clock = fakeTimers() })
  afterEach(() => { clock.restore() })

  const logs = silenceConsole()
  const messages = () => logs.map(({ args }) => args.map(String).join(' '))

  it('reports a healthy, fully subscribed connection once', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a', 'b'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.tick(60e3)
    assert.equal(t.emits.length, 1)
    assert.deepEqual(t.heals, [])
    // Also checks that the helper used by the tabs' tests has the same fields
    assert.deepEqual(t.status(), connectionStatus('open', { at: t.clock.now, since: t.startedAt, wanted: 2 }))
    assert.equal(t.emits.length, 1)
    assert.ok(messages().includes('[connection] open (wanted 2, missing 0, pending 0)'))
  })

  it("doesn't heal or report degraded while the connection isn't open", () => {
    const t = harness({ client: fakeClient({ state: 'offline' }), wanted: ['a', 'b'] })
    t.start()
    t.clock.tick(60e3)
    let status = t.status()
    assert.equal(status.state, 'offline')
    assert.deepEqual(status.missing, ['a', 'b'])
    assert.equal(status.unsubscribedSince, null)
    assert.equal(status.degraded, false)

    t.env.client = null
    t.monitor.update()
    t.clock.tick(60e3)
    status = t.status()
    assert.equal(status.state, 'closed')
    assert.equal(status.since, null)
    assert.equal(status.degraded, false)
    assert.deepEqual(t.heals, [])
  })

  it(`heals a contract left unsubscribed after the grace period, backed off, and stops reporting it as degraded after ${CONNECTION_MAX_DEGRADED_HEALS} attempts`, () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2', 'zC3'] })
    const refused = `[connection] 1 subscription(s) still refused after ${CONNECTION_MAX_DEGRADED_HEALS} attempts; no longer reported as degraded, still re-subscribing`
    t.start()
    let status = t.status()
    assert.equal(status.state, 'open')
    assert.deepEqual(status.missing, ['zC3'])
    assert.equal(status.unsubscribedSince, t.startedAt)
    assert.equal(status.degraded, false)

    t.clock.tick(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    assert.deepEqual(t.heals, [])

    // The server keeps refusing the subscription: the heals change nothing
    const at = (ms) => t.startedAt + ms
    t.clock.tick(at(40e3) - t.clock.now)
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3)])
    status = t.status()
    assert.equal(status.degraded, false)
    assert.deepEqual(status.missing, ['zC3'])
    assert.equal(status.unsubscribedSince, t.startedAt)
    assert.equal(status.heals, 3)

    // Still requested, backed off, but no longer reported as degraded
    t.clock.tick(60e3)
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3), at(80e3)])
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 4)
    assert.deepEqual(t.emits.map(({ degraded, missing }) => [degraded, missing.length]), [[false, 1], [true, 1], [false, 1]])
    // By the recompute that follows the heal (sinon runs a 0 ms timeout set by a timer callback 1 ms later)
    assert.equal(t.emits[2].at, at(40e3) + 1)
    assert.ok(messages().includes('[connection] degraded: 1 missing, 0 pending for 10 s; re-subscribing'))
    assert.ok(messages().includes('[connection] still degraded: 1 missing, 0 pending for 20 s; re-subscribing (attempt 2)'))
    assert.equal(messages().filter(message => message === refused).length, 1)
    assert.ok(!messages().includes('[connection] subscriptions healthy again'))
    assert.ok(messages().every(message => !/z[ABC]\d/.test(message)), 'no contract IDs in the logs')

    // Subscribed at last
    t.env.client.subscriptionSet.add('zC3')
    createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {} })['subscription-succeeded']()
    t.clock.tick(0)
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 0)
    assert.equal(status.unsubscribedSince, null)
    // Nothing the tabs show changed
    assert.equal(t.emits.length, 3)
    assert.ok(messages().includes('[connection] subscriptions healthy again'))

    // Counted again once it was subscribed: a new episode starts without the
    // previous backoff
    t.env.client.subscriptionSet.delete('zC3')
    const lostAt = t.clock.now
    t.monitor.update()
    t.clock.tick(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.status().degraded, true)
    assert.equal(t.heals.length, 5)
    assert.ok(t.heals[4] - lostAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(t.heals[4] - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('heals a newly lost contract promptly while another is refused', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2', 'zC3'] })
    t.start()
    // `zC3` was given up at 40 s
    t.clock.tick(100e3)
    assert.equal(t.status().degraded, false)
    assert.equal(t.heals.length, 4)
    assert.equal(t.status().heals, 4)

    t.env.client.subscriptionSet.delete('zB2')
    const lostAt = t.clock.now
    t.monitor.update()
    t.clock.tick(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    assert.equal(t.heals.length, 4)

    // Not after `zC3`'s backoff (160 s)
    t.clock.tick(CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 5)
    const firstHeal = t.heals[4]
    assert.ok(firstHeal - lostAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(firstHeal - lostAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    const status = t.status()
    assert.equal(status.degraded, true)
    assert.deepEqual(status.missing, ['zB2', 'zC3'])
    assert.equal(status.heals, 1)

    // Degraded until `zB2`'s third request
    t.clock.tick(60e3)
    assert.deepEqual(t.heals.slice(4), [firstHeal, firstHeal + 10e3, firstHeal + 30e3])
    // Losing `zB2` only changed how many are missing, which isn't broadcast
    assert.deepEqual(
      t.emits.slice(3).map(({ at, degraded, missing }) => [at, degraded, missing.length]),
      [[firstHeal, true, 2], [firstHeal + 30e3 + 1, false, 2]]
    )
    assert.equal(t.status().degraded, false)
  })

  it('counts a refused contract again once it was no longer wanted', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zC3'] })
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {} })
    t.start()
    t.clock.tick(60e3)
    assert.equal(t.status().degraded, false)

    // Unwanted, then wanted again, while the connection is down (e.g., a
    // logout and a login)
    closeSocket(t)
    handlers.close()
    t.clock.tick(0)
    t.setWanted(['zA1'])
    t.clock.tick(0)
    t.setWanted(['zA1', 'zC3'])
    t.clock.tick(0)

    openSocket(t, handlers)
    t.env.client.ack('zA1')
    t.monitor.update()
    t.clock.tick(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    const status = t.status()
    assert.deepEqual(status.pending, [])
    assert.equal(status.degraded, true)
  })

  it('caps the re-subscription backoff', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zB2'], maxHealDelay: 25e3 })
    t.start()
    t.clock.tick(100e3)
    const at = (ms) => t.startedAt + ms
    assert.deepEqual(t.heals, [at(10e3), at(20e3), at(40e3), at(65e3), at(90e3)])
  })

  it('answers status queries without re-subscribing, logging or broadcasting', () => {
    const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2'] })
    t.start()
    // The grace period ends between two ticks
    t.clock.tick(CONNECTION_TICK_INTERVAL / 2)
    t.env.client.subscriptionSet.delete('zB2')
    const lostAt = t.clock.now
    t.monitor.update()
    t.clock.tick(CONNECTION_DEGRADED_GRACE + 500)

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
    assert.equal(t.clock.countTimers(), 1)

    t.clock.tick(CONNECTION_TICK_INTERVAL)
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
    t.clock.tick(CONNECTION_DEGRADED_GRACE)
    assert.equal(t.heals.length, 1)
    // Requested, waiting for the server. The recompute that follows the heal
    // (sinon runs a 0 ms timeout set by a timer callback 1 ms later).
    t.clock.tick(1)
    let status = t.status()
    assert.deepEqual(status.missing, [])
    assert.deepEqual(status.pending, ['b'])
    assert.equal(status.degraded, true)
    assert.equal(t.emits.at(-1).degraded, true)

    t.env.client.ack('b')
    t.monitor.update()
    t.clock.tick(0)
    status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(t.emits.at(-1).degraded, false)
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
    t.clock.tick(CONNECTION_DEGRADED_GRACE)
    // Sinon runs a 0 ms timeout set by a timer callback 1 ms later
    t.clock.tick(1)
    const healedAt = t.startedAt + CONNECTION_DEGRADED_GRACE
    // Broadcast by the recompute that follows the heal, not by the next tick
    assert.deepEqual(emitted.map(({ at, degraded }) => [at, degraded]), [[t.startedAt, false], [healedAt, true], [healedAt + 1, false]])
    assert.ok(messages().some(message => message.startsWith('[connection] Error emitting the connection status')))
    assert.ok(!messages().some(message => message.startsWith('[connection] Error computing the connection status')))
  })

  it("shows but doesn't heal pending-only degradation", () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'], pending: ['b'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.tick(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
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
    t.clock.tick(8e3)
    closeSocket(t)
    t.monitor.update()
    t.clock.tick(0)
    let status = t.status()
    assert.equal(status.state, 'reconnecting')
    assert.equal(status.unsubscribedSince, null)
    assert.equal(status.degraded, false)

    t.clock.tick(5e3)
    const openedAt = t.clock.now
    t.env.client.setState('open', openedAt)
    t.env.client.ack('a')
    t.monitor.update()
    t.clock.tick(0)
    assert.equal(t.status().unsubscribedSince, openedAt)
    t.clock.tick(CONNECTION_DEGRADED_GRACE - 1)
    assert.equal(t.status().degraded, false)
    t.clock.tick(1)
    status = t.status()
    assert.equal(status.degraded, true)
    // Queries don't heal: the next tick does
    assert.deepEqual(t.heals, [])
    t.clock.tick(CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 1)
    assert.ok(t.heals[0] - openedAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  it('restarts the grace period and the backoff once reconnected', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.tick(30e3)
    assert.equal(t.heals.length, 2)
    assert.equal(t.status().heals, 2)

    // The library requests the subscriptions again: the monitor doesn't
    const reconnectedAt = t.clock.now
    t.monitor.onReconnected()
    t.clock.tick(0)
    assert.equal(t.heals.length, 2)
    const status = t.status()
    assert.equal(status.degraded, false)
    assert.equal(status.heals, 0)
    assert.equal(status.unsubscribedSince, reconnectedAt)
    assert.equal(t.emits.at(-1).degraded, false)

    t.clock.tick(CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
    assert.equal(t.heals.length, 3)
    assert.ok(t.heals[2] - reconnectedAt >= CONNECTION_DEGRADED_GRACE)
    assert.ok(t.heals[2] - reconnectedAt < CONNECTION_DEGRADED_GRACE + CONNECTION_TICK_INTERVAL)
  })

  describe('resetHealBackoff (a page restarting the reconnection cycle)', () => {
    it('re-subscribes at the next recompute instead of after the backoff', () => {
      // Not given up on, so that it's still degraded when the backoff reaches its cap
      const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zB2'], maxDegradedHeals: 10 })
      t.start()
      const at = (ms) => t.startedAt + ms
      // The next request is due 5 minutes after the last one
      t.clock.tick(at(330e3) - t.clock.now)
      assert.deepEqual(t.heals, [10e3, 20e3, 40e3, 80e3, 160e3, 320e3].map(at))
      let status = t.status()
      assert.equal(status.degraded, true)
      assert.equal(status.heals, 6)

      t.monitor.resetHealBackoff()
      t.clock.tick(0)
      assert.deepEqual(t.heals.slice(6), [at(330e3)])
      status = t.status()
      assert.equal(status.degraded, true)
      assert.equal(status.heals, 1)
      // The grace period didn't restart
      assert.equal(status.unsubscribedSince, t.startedAt)
      assert.ok(messages().includes('[connection] still degraded: 1 missing, 0 pending for 330 s; re-subscribing (attempt 1)'))

      // The backoff starts over
      t.clock.tick(CONNECTION_DEGRADED_GRACE)
      assert.deepEqual(t.heals.slice(6), [at(330e3), at(340e3)])
    })

    it("doesn't re-subscribe before the grace period", () => {
      const t = harness({ client: fakeClient({ subscribed: ['zA1', 'zB2'] }), wanted: ['zA1', 'zB2'] })
      t.start()
      t.env.client.subscriptionSet.delete('zB2')
      const lostAt = t.clock.now
      t.monitor.update()
      t.clock.tick(CONNECTION_DEGRADED_GRACE - 1000)
      t.monitor.resetHealBackoff()
      t.clock.tick(0)
      assert.deepEqual(t.heals, [])
      assert.equal(t.status().unsubscribedSince, lostAt)
      assert.equal(t.status().degraded, false)
      // Requested as the grace period ends (at a tick), as without the reset
      t.clock.tick(1000)
      assert.deepEqual(t.heals, [lostAt + CONNECTION_DEGRADED_GRACE])
    })

    it("doesn't let quick restarts spend the attempts of a refused contract", () => {
      const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zC3'] })
      t.start()
      const at = (ms) => t.startedAt + ms
      // The first two requests, at the pace of the back-off
      t.clock.tick(20e3)
      assert.deepEqual(t.heals, [at(10e3), at(20e3)])
      assert.equal(t.status().degraded, true)

      // Three tab switches in quick succession, each followed by its
      // recompute: none of them asks the server again less than a grace
      // period after the last request, so the third request that stops the
      // banner isn't made within seconds of the first
      for (let i = 0; i < 3; i++) {
        t.monitor.resetHealBackoff()
        t.clock.tick(0)
      }
      assert.deepEqual(t.heals, [at(10e3), at(20e3)])
      assert.equal(t.status().degraded, true)

      // The restart's request comes a grace period after the last one, before
      // the 40 s back-off, and it's the third: the episode ends
      t.clock.tick(CONNECTION_DEGRADED_GRACE)
      assert.deepEqual(t.heals, [at(10e3), at(20e3), at(30e3)])
      assert.equal(t.status().degraded, false)
    })

    it(`doesn't report a contract refused ${CONNECTION_MAX_DEGRADED_HEALS} times as degraded again`, () => {
      const t = harness({ client: fakeClient({ subscribed: ['zA1'] }), wanted: ['zA1', 'zC3'] })
      t.start()
      t.clock.tick(60e3)
      assert.equal(t.heals.length, CONNECTION_MAX_DEGRADED_HEALS)
      assert.equal(t.status().degraded, false)
      const emits = t.emits.length

      t.monitor.resetHealBackoff()
      // The recompute that follows the heal too (sinon runs a 0 ms timeout set by a timer callback 1 ms later)
      t.clock.tick(1)
      // Still requested right away
      assert.equal(t.heals.length, CONNECTION_MAX_DEGRADED_HEALS + 1)
      assert.equal(t.status().degraded, false)
      assert.equal(t.emits.length, emits)
    })
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

  it("normalizes the library's status", () => {
    const status = { state: 'offline', since: null, missing: [], pending: ['a', 7] }
    const t = harness({ wanted: ['a'], getLibStatus: () => status })
    t.start()
    assert.deepEqual(t.status(), connectionStatus('offline', { at: t.clock.now, wanted: 1, pending: ['a'] }))

    // Without its own count, the monitor's, with what isn't a contract ID left out
    t.monitor.setWanted(['a', 'a', 42, 'b'])
    assert.equal(t.status().wanted, 2)
    t.monitor.setWanted(undefined)
    assert.equal(t.status().wanted, 0)
  })

  it("keeps the last status while the library's status can't be read or is invalid", () => {
    let current = null
    const t = harness({
      client: fakeClient({ subscribed: ['zA1'] }),
      wanted: ['zA1'],
      getLibStatus: () => current ? current() : libStatus(t.env.client, t.env.wanted)
    })
    t.start()
    assert.equal(t.emits.length, 1)
    for (current of [
      () => { throw new Error('unreadable') },
      () => null,
      () => 'open',
      () => ({ state: 'open', missing: 'zA1', pending: [] }),
      () => ({ state: 'open', missing: [] }),
      () => ({ state: 'unknown', missing: [], pending: [] })
    ]) {
      t.clock.tick(CONNECTION_TICK_INTERVAL)
      // Not a closed connection without a client
      assert.equal(t.status(), t.emits[0], String(current))
    }
    assert.equal(t.emits.length, 1)
    assert.ok(messages().some(message => message.startsWith('[connection] Error computing the connection status')))
  })

  it('logs a failure to compute the status once until it succeeds again', () => {
    let broken = false
    const t = harness({
      client: fakeClient({ subscribed: ['zA1'] }),
      wanted: ['zA1'],
      getLibStatus: () => {
        if (broken) throw new Error('unreadable')
        return libStatus(t.env.client, t.env.wanted)
      }
    })
    const failures = () => messages().filter(message => message.startsWith('[connection] Error computing the connection status')).length
    const recoveries = () => messages().filter(message => message === '[connection] computing the connection status works again').length
    t.start()
    assert.equal(failures(), 0)

    // Ticks and queries
    broken = true
    for (let i = 0; i < 5; i++) {
      t.clock.tick(CONNECTION_TICK_INTERVAL)
      t.status()
    }
    assert.equal(failures(), 1)
    assert.equal(recoveries(), 0)

    broken = false
    t.clock.tick(CONNECTION_TICK_INTERVAL)
    t.status()
    assert.equal(recoveries(), 1)

    // A new run of failures is logged again, once
    broken = true
    t.status()
    t.clock.tick(3 * CONNECTION_TICK_INTERVAL)
    assert.equal(failures(), 2)
    assert.equal(recoveries(), 1)
  })

  describe('never throws', () => {
    const fail = () => { throw new Error('boom') }

    it('when re-subscribing throws', () => {
      const t = harness({ wanted: ['a'], onHeal: fail })
      t.start()
      t.clock.tick(60e3)
      assert.ok(t.heals.length > 1)
      assert.ok(messages().some(message => message.startsWith('[connection] Error requesting re-subscription')))
    })

    it('when re-subscribing rejects', async () => {
      const t = harness({ wanted: ['a'], onHeal: () => Promise.reject(new Error('rejected')) })
      t.start()
      t.clock.tick(CONNECTION_DEGRADED_GRACE)
      assert.equal(t.heals.length, 1)
      await settle()
      assert.ok(messages().some(message => message.startsWith('[connection] Error requesting re-subscription') && message.includes('rejected')))
    })

    it("when the library's status throws, without a previous status", () => {
      const t = harness({ wanted: ['a', 'a', 42, 'b'], getLibStatus: fail })
      assert.doesNotThrow(() => {
        t.start()
        t.monitor.update()
        t.monitor.onReconnected()
        t.clock.tick(60e3)
      })
      // The fallback uses the injected clock
      assert.deepEqual(t.status(), connectionStatus('closed', { at: t.clock.now, source: 'app', wanted: 2 }))
      assert.deepEqual(t.emits, [])
      assert.deepEqual(t.heals, [])
    })

    it('when the timers throw', () => {
      // Over the fake timers, restored before the test ends
      const stubs = ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'].map(name => sinon.stub(globalThis, name).callsFake(fail))
      try {
        const t = harness({ wanted: ['a'] })
        assert.doesNotThrow(() => {
          t.monitor.start()
          t.monitor.update()
          t.monitor.onReconnected()
          t.monitor.start()
        })
        assert.equal(t.status().state, 'open')
        assert.ok(messages().some(message => message.startsWith('[connection] Error starting the connection monitor')))
      } finally {
        for (const stub of stubs) stub.restore()
      }
    })

    it('when the monitor or the legacy events throw in a pubsub handler', () => {
      const handlers = createPubsubHandlers({ monitor: { update: fail, onReconnected: fail }, emitEvent: fail })
      for (const [name, handler] of Object.entries(handlers)) {
        assert.doesNotThrow(() => handler(), name)
      }
    })

    it("and a failing step of a pubsub handler doesn't prevent the next ones", () => {
      const calls = []
      const monitor = { update: () => calls.push('update'), onReconnected: () => calls.push('onReconnected') }
      const handlers = createPubsubHandlers({ monitor, emitEvent: fail })
      handlers.offline()
      handlers['reconnection-succeeded']()
      assert.deepEqual(calls, ['update', 'onReconnected'])
    })
  })

  it('has nothing missing once nothing is wanted (logout, chelonia/reset)', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a', 'b'] })
    t.start()
    t.clock.tick(CONNECTION_DEGRADED_GRACE)
    assert.equal(t.status().degraded, true)
    t.setWanted([])
    // The recompute that follows the heal is still pending: sinon runs a 0 ms timeout set by a timer callback 1 ms later
    t.clock.tick(1)
    const status = t.status()
    assert.equal(status.wanted, 0)
    assert.deepEqual(status.missing, [])
    assert.equal(status.degraded, false)
    assert.equal(t.emits.at(-1).degraded, false)
  })

  it('recomputes once for a burst of updates', () => {
    const t = harness({ client: fakeClient({ subscribed: ['a'] }), wanted: ['a'] })
    t.clock.tick(0)
    t.env.libStatusCalls = 0
    t.emits.length = 0
    t.env.client.setState('reconnecting', t.clock.now)
    for (let i = 0; i < 100; i++) t.monitor.update()
    t.clock.tick(0)
    assert.equal(t.env.libStatusCalls, 1)
    assert.equal(t.emits.length, 1)
  })

  it("doesn't broadcast each subscription confirmed after a reconnection", () => {
    const wanted = ['zA1', 'zB2', 'zC3', 'zD4']
    const t = harness({ client: fakeClient({ subscribed: wanted }), wanted })
    const handlers = createPubsubHandlers({ monitor: t.monitor, emitEvent: () => {} })
    t.start()
    const { client } = t.env
    closeSocket(t)
    handlers.close()
    t.clock.tick(0)
    openSocket(t, handlers)
    t.clock.tick(0)
    // Each OK is a separate message, with its own recompute
    for (const id of wanted) {
      client.ack(id)
      handlers['subscription-succeeded']()
      t.clock.tick(0)
    }
    // A wanted contract added and subscribed at once (e.g., a joined chatroom)
    client.subscriptionSet.add('zE5')
    t.setWanted([...wanted, 'zE5'])
    t.clock.tick(0)
    assert.deepEqual(
      t.emits.map(({ state, pending }) => [state, pending.length]),
      [['open', 0], ['reconnecting', 4], ['open', 4]]
    )
    const status = t.status()
    assert.equal(status.wanted, 5)
    assert.deepEqual(status.pending, [])
  })

  it('broadcasts a closed status again once it has a client', () => {
    const t = harness({ client: null, wanted: ['zA1'] })
    t.start()
    // A client that was closed for good right after it was created
    t.env.client = fakeClient({ state: 'closed' })
    t.env.client.since = t.clock.now
    t.monitor.update()
    t.clock.tick(0)
    assert.deepEqual(t.emits.map(({ state, since }) => [state, since]), [['closed', null], ['closed', t.clock.now]])
  })

  it('starts its periodic check once, and computes the status right away', () => {
    const t = harness({ client: null, wanted: null })
    t.monitor.start()
    t.monitor.start()
    // The interval and the update scheduled by `start()`
    assert.equal(t.clock.countTimers(), 2)
    t.clock.tick(0)
    assert.equal(t.clock.countTimers(), 1)
    // A restarted service worker tells the tabs that it has no connection yet
    assert.deepEqual(t.emits.map(({ state, since }) => [state, since]), [['closed', null]])
  })
})
