/* eslint-env mocha */
import assert from 'node:assert/strict'
import { connectionStatus } from '../../../test/unit-helpers/connectionStatus.js'
import { deferred, fakeTimers, settle, silenceConsole } from '../../../test/unit-helpers/utils.js'
import { createReconnectionPolicy } from './reconnectionPolicy.ts'

// The pubsub client fields the policy uses. `destroy()` makes it `closed`, as
// in `@chelonia/lib` 2.2.0.
const fakeClient = (state) => ({
  state,
  destroyed: 0,
  destroy () {
    this.destroyed++
    this.state = 'closed'
  }
})

// The second argument of `PUBSUB_RECONNECTION_SCHEDULED` after the first
// attempt of a client failed (`nth` is the number of the attempt scheduled)
const afterFailure = { delay: 1000, nth: 2 }

// `pages`: what `countPages()` answers (a number, or a function returning
// the answer). `clientsApi: false`: a browsing context, without
// `self.clients`. `client` may be given as `undefined`: no client yet.
const harness = (options = {}) => {
  const { degraded = false, missing = [], offline = false, pages = 1, clientsApi = true, ...rest } = options
  const client = 'client' in options ? options.client : fakeClient('reconnecting')
  delete rest.client
  const env = { client, degraded, missing, offline, pages, reconnects: [], resets: 0, pageCounts: 0, onReconnect: null }
  const policy = createReconnectionPolicy({
    getClient: () => env.client,
    reconnect: (reason) => {
      env.reconnects.push(reason)
      if (env.onReconnect) return env.onReconnect(reason)
      // Like `chelonia/connect`: a new client, which connects right away
      env.client = fakeClient('connecting')
    },
    resetHealBackoff: () => { env.resets++ },
    getStatus: () => connectionStatus(env.client?.state ?? 'closed', { degraded: env.degraded, missing: env.missing }),
    countPages: clientsApi
      ? () => {
          env.pageCounts++
          return typeof env.pages === 'function' ? env.pages() : Promise.resolve(env.pages)
        }
      : undefined,
    isOffline: () => env.offline,
    ...rest
  })
  return { env, policy }
}

let clock

describe('reconnection policy', () => {
  beforeEach(() => { clock = fakeTimers() })
  afterEach(() => {
    // The policy has no timers of its own
    assert.equal(clock.countTimers(), 0)
    clock.restore()
  })

  const logs = silenceConsole()
  const messages = () => logs.map(({ args }) => args.map(String).join(' '))

  describe('restart', () => {
    for (const state of ['reconnecting', 'closed']) {
      it(`re-creates a client that is ${state}`, () => {
        const old = fakeClient(state)
        const t = harness({ client: old })
        assert.equal(t.policy.restart('page-opened'), 'reconnecting')
        assert.deepEqual(t.env.reconnects, ['page-opened'])
        assert.notEqual(t.env.client, old)
        assert.equal(t.env.resets, 0)
        assert.deepEqual(messages(), [`[connection] page-opened while ${state}; restarting the reconnection cycle`])
      })
    }

    // A destroyed client no longer listens to `online`, so nothing else would
    // re-create it once the network is back
    for (const reason of ['page-opened', 'tab-visible', 'retry-button']) {
      it(`re-creates a closed client on an offline device (${reason})`, () => {
        const old = fakeClient('closed')
        const t = harness({ client: old, offline: true })
        assert.equal(t.policy.restart(reason), 'reconnecting')
        assert.deepEqual(t.env.reconnects, [reason])
        assert.notEqual(t.env.client, old)
        assert.deepEqual(messages(), [`[connection] ${reason} while closed; restarting the reconnection cycle`])
      })
    }

    it('leaves the client re-created on an offline device to its own online listener', () => {
      const t = harness({ client: fakeClient('closed'), offline: true })
      assert.equal(t.policy.restart('page-opened'), 'reconnecting')
      // Its first attempt failed while offline
      t.env.client.state = 'offline'
      assert.equal(t.policy.restart('tab-visible'), 'nothing-to-do')
      // A state the library hasn't updated yet
      t.env.client.state = 'reconnecting'
      assert.equal(t.policy.restart('retry-button'), 'nothing-to-do')
      assert.deepEqual(t.env.reconnects, ['page-opened'])
    })

    it('resets the heal back-off of an open but degraded connection, without reconnecting', () => {
      const t = harness({ client: fakeClient('open'), degraded: true, missing: ['zA1'] })
      assert.equal(t.policy.restart('tab-visible'), 'healing')
      assert.equal(t.env.resets, 1)
      assert.deepEqual(t.env.reconnects, [])
      assert.deepEqual(messages(), ['[connection] tab-visible while degraded; re-subscribing now'])
    })

    // The requests are already on their way; the monitor doesn't heal those
    // either
    it('does nothing for a connection degraded by pending subscriptions only', () => {
      const t = harness({ client: fakeClient('open'), degraded: true })
      for (const reason of ['page-opened', 'tab-visible', 'retry-button']) {
        assert.equal(t.policy.restart(reason), 'nothing-to-do', reason)
      }
      assert.equal(t.env.resets, 0)
      assert.deepEqual(t.env.reconnects, [])
      assert.deepEqual(messages(), [])
    })

    const nothingToDo = [
      ['a healthy open connection', { client: fakeClient('open') }],
      ['a connection attempt that is running', { client: fakeClient('connecting'), degraded: true }],
      ['an offline client', { client: fakeClient('offline') }],
      // Its own `online` listener resumes it
      ['a reconnecting client on an offline device', { client: fakeClient('reconnecting'), offline: true }],
      ['no client', { client: null }],
      ['no client yet', { client: undefined }],
      ['a client without a state', { client: {} }]
    ]
    for (const [description, options] of nothingToDo) {
      it(`does nothing for ${description}`, () => {
        const t = harness(options)
        for (const reason of ['page-opened', 'tab-visible', 'retry-button']) {
          assert.equal(t.policy.restart(reason), 'nothing-to-do', reason)
        }
        assert.deepEqual(t.env.reconnects, [])
        assert.equal(t.env.resets, 0)
        assert.deepEqual(messages(), [])
      })
    }

    it('reconnects once for quick restarts, which find the new client connecting', () => {
      const t = harness({ client: fakeClient('reconnecting') })
      const results = ['page-opened', 'tab-visible', 'retry-button'].map(reason => t.policy.restart(reason))
      assert.deepEqual(results, ['reconnecting', 'nothing-to-do', 'nothing-to-do'])
      assert.deepEqual(t.env.reconnects, ['page-opened'])
    })

    it('restarts again once the new client is waiting out a back-off', () => {
      const t = harness({ client: fakeClient('closed') })
      assert.equal(t.policy.restart('retry-button'), 'reconnecting')
      // Its first attempt failed
      t.env.client.state = 'reconnecting'
      assert.equal(t.policy.restart('retry-button'), 'reconnecting')
      assert.deepEqual(t.env.reconnects, ['retry-button', 'retry-button'])
    })

    it('logs and swallows an error thrown by reconnect', () => {
      const t = harness({ client: fakeClient('closed') })
      t.env.onReconnect = () => { throw new Error('boom') }
      assert.equal(t.policy.restart('retry-button'), 'nothing-to-do')
      assert.ok(messages().some(message => message.startsWith('[connection] Error restarting the reconnection cycle (retry-button)') && message.includes('boom')))
    })

    it('logs and swallows a rejection of reconnect', async () => {
      const t = harness({ client: fakeClient('closed') })
      t.env.onReconnect = () => Promise.reject(new Error('rejected'))
      assert.equal(t.policy.restart('page-opened'), 'reconnecting')
      await settle()
      assert.ok(messages().some(message => message.startsWith('[connection] Error restarting the reconnection cycle (page-opened)') && message.includes('rejected')))
    })

    it('never throws when its dependencies do', () => {
      const fail = () => { throw new Error('boom') }
      for (const options of [{ getClient: fail }, { getStatus: fail, client: fakeClient('open') }, { resetHealBackoff: fail, client: fakeClient('open'), degraded: true, missing: ['zA1'] }]) {
        const t = harness(options)
        assert.equal(t.policy.restart('tab-visible'), 'nothing-to-do')
      }
      assert.equal(messages().filter(message => message.startsWith('[connection] Error handling a restart of the reconnection cycle (tab-visible)')).length, 3)
    })

    it('reconnects when whether the device is offline is unknown', () => {
      const t = harness({ client: fakeClient('reconnecting'), isOffline: () => { throw new Error('boom') } })
      assert.equal(t.policy.restart('tab-visible'), 'reconnecting')
      assert.deepEqual(t.env.reconnects, ['tab-visible'])
    })
  })

  describe('onReconnectionScheduled', () => {
    const pausing = '[connection] no open pages; pausing reconnection until a page is opened'

    it('pauses (destroys the client) when no page is open', async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0 })
      t.policy.onReconnectionScheduled(t.env.client, afterFailure)
      await settle()
      assert.equal(t.env.client.destroyed, 1)
      assert.equal(t.env.client.state, 'closed')
      assert.deepEqual(messages(), [pausing])
    })

    it('pauses at any later failed attempt', async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0 })
      t.policy.onReconnectionScheduled(t.env.client, { delay: 600000, nth: 40 })
      await settle()
      assert.equal(t.env.client.destroyed, 1)
    })

    // An open connection that was lost (e.g., a server restart, a ping
    // timeout), or a device that came back online: retried once first
    it("doesn't pause for the first attempt after a lost connection", async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0 })
      t.policy.onReconnectionScheduled(t.env.client, { delay: 500, nth: 1 })
      await settle()
      assert.equal(t.env.pageCounts, 0, 'the pages are not even counted')
      assert.equal(t.env.client.destroyed, 0)
      assert.deepEqual(messages(), [])
      // That attempt failed too
      t.policy.onReconnectionScheduled(t.env.client, afterFailure)
      await settle()
      assert.equal(t.env.client.destroyed, 1)
      assert.deepEqual(messages(), [pausing])
    })

    // Each of those connections opened, which keeps `nth` at 1
    it('pauses once a connection is replaced for unanswered requests a second time in a row', async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0 })
      t.env.client.unansweredReplacements = 1
      t.policy.onReconnectionScheduled(t.env.client, { delay: 500, nth: 1 })
      await settle()
      assert.equal(t.env.client.destroyed, 0)
      t.env.client.unansweredReplacements = 2
      t.policy.onReconnectionScheduled(t.env.client, { delay: 1000, nth: 1 })
      await settle()
      assert.equal(t.env.client.destroyed, 1)
    })

    // Not sent by `@chelonia/lib` 2.2.0: retrying is the safe default
    it("doesn't pause without a valid attempt number", async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0 })
      for (const detail of [undefined, null, {}, { nth: '2' }, { nth: NaN }, 2]) {
        assert.doesNotThrow(() => t.policy.onReconnectionScheduled(t.env.client, detail))
      }
      await settle()
      assert.equal(t.env.pageCounts, 0)
      assert.equal(t.env.client.destroyed, 0)
      assert.deepEqual(messages(), [])
    })

    for (const pages of [1, 3]) {
      it(`keeps reconnecting with ${pages} open page(s)`, async () => {
        const t = harness({ client: fakeClient('reconnecting'), pages })
        t.policy.onReconnectionScheduled(t.env.client, afterFailure)
        await settle()
        assert.equal(t.env.pageCounts, 1)
        assert.equal(t.env.client.destroyed, 0)
        assert.deepEqual(messages(), [])
      })
    }

    it("doesn't pause a client replaced while the pages were counted", async () => {
      const answer = deferred()
      const old = fakeClient('reconnecting')
      const t = harness({ client: old, pages: () => answer.promise })
      t.policy.onReconnectionScheduled(old, afterFailure)
      t.env.client = fakeClient('reconnecting')
      answer.resolve(0)
      await settle()
      assert.equal(old.destroyed, 0)
      assert.equal(t.env.client.destroyed, 0)
    })

    for (const state of ['open', 'connecting', 'closed']) {
      it(`doesn't pause a client that became ${state} while the pages were counted`, async () => {
        const answer = deferred()
        const t = harness({ client: fakeClient('reconnecting'), pages: () => answer.promise })
        t.policy.onReconnectionScheduled(t.env.client, afterFailure)
        t.env.client.state = state
        answer.resolve(0)
        await settle()
        assert.equal(t.env.client.destroyed, 0)
        assert.deepEqual(messages(), [])
      })
    }

    it('pauses a client that went offline while the pages were counted', async () => {
      const t = harness({ client: fakeClient('offline'), pages: 0 })
      t.policy.onReconnectionScheduled(t.env.client, afterFailure)
      await settle()
      assert.equal(t.env.client.destroyed, 1)
    })

    it("doesn't pause when counting the pages fails", async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: () => Promise.reject(new Error('rejected')) })
      t.policy.onReconnectionScheduled(t.env.client, afterFailure)
      t.env.pages = () => { throw new Error('thrown') }
      assert.doesNotThrow(() => t.policy.onReconnectionScheduled(t.env.client, afterFailure))
      await settle()
      assert.equal(t.env.client.destroyed, 0)
      const failures = messages().filter(message => message.startsWith('[connection] Error counting the open pages; not pausing reconnection'))
      assert.equal(failures.length, 2)
      assert.ok(failures.some(message => message.includes('rejected')))
      assert.ok(failures.some(message => message.includes('thrown')))
    })

    it("doesn't pause on an unexpected answer", async () => {
      const t = harness({ client: fakeClient('reconnecting') })
      for (const pages of [undefined, null, '0', NaN, -1]) {
        t.env.pages = pages
        t.policy.onReconnectionScheduled(t.env.client, afterFailure)
      }
      await settle()
      assert.equal(t.env.client.destroyed, 0)
    })

    it('logs and swallows an error thrown by destroy()', async () => {
      const client = { state: 'reconnecting', destroy () { throw new Error('boom') } }
      const t = harness({ client, pages: 0 })
      assert.doesNotThrow(() => t.policy.onReconnectionScheduled(client, afterFailure))
      await settle()
      assert.ok(messages().some(message => message.startsWith('[connection] Error pausing reconnection') && message.includes('boom')))
    })

    it('does nothing without a clients API (a browsing context)', async () => {
      const t = harness({ client: fakeClient('reconnecting'), pages: 0, clientsApi: false })
      assert.doesNotThrow(() => t.policy.onReconnectionScheduled(t.env.client, afterFailure))
      await settle()
      assert.equal(t.env.client.destroyed, 0)
      assert.deepEqual(messages(), [])
    })
  })

  it('re-creates a paused client once a page is opened', async () => {
    const paused = fakeClient('reconnecting')
    const t = harness({ client: paused, pages: 0 })
    t.policy.onReconnectionScheduled(paused, afterFailure)
    await settle()
    assert.equal(paused.state, 'closed')
    t.env.pages = 1
    assert.equal(t.policy.restart('page-opened'), 'reconnecting')
    assert.equal(t.policy.restart('page-opened'), 'nothing-to-do')
    assert.deepEqual(t.env.reconnects, ['page-opened'])
    assert.notEqual(t.env.client, paused)
    assert.equal(paused.destroyed, 1)
    assert.deepEqual(messages(), [
      '[connection] no open pages; pausing reconnection until a page is opened',
      '[connection] page-opened while closed; restarting the reconnection cycle'
    ])
  })
})
