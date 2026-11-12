/* eslint-env mocha */
import assert from 'node:assert/strict'
import { Buffer } from 'buffer'
import { getSubscriptionId } from '@chelonia/lib/functions'
import { PUSH_SERVER_ACTION_TYPE, REQUEST_TYPE } from '@chelonia/lib/pubsub'
import { fakeClock } from '../../../test/unit-helpers/fakeClock.js'
import { deferred, settle, silenceConsole } from '../../../test/unit-helpers/utils.js'
import { PUBSUB_NOT_OPEN_ERROR } from '../../utils/constants.js'
import {
  VAPID_CACHE_DURATION,
  VAPID_REQUEST_TIMEOUT,
  bufferEq,
  createPushReporter
} from './pushReporter.js'

const SOCKET = { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 }

const fakeSocket = (readyState = SOCKET.OPEN) => ({
  ...SOCKET,
  readyState,
  sent: [],
  send (message) {
    this.sent.push(message)
  },
  actions () {
    return this.sent.map(message => {
      assert.equal(message.type, REQUEST_TYPE.PUSH_ACTION)
      return message.data.action
    })
  }
})

const fakeClient = (readyState) => ({ socket: fakeSocket(readyState) })

const KEY = new Uint8Array([1, 2, 3, 250, 251, 252])
const OTHER_KEY = new Uint8Array([9, 8, 7, 6, 5, 4])
const base64url = (bytes) => Buffer.from(bytes).toString('base64url')

const fakeSubscription = (endpoint, key = KEY) => ({
  endpoint,
  expirationTime: null,
  options: { applicationServerKey: key.slice().buffer },
  unsubscribed: false,
  toJSON () {
    return { endpoint, expirationTime: null, keys: { p256dh: `p256dh-${endpoint}`, auth: `auth-${endpoint}` } }
  },
  unsubscribe () {
    this.unsubscribed = true
    return Promise.resolve(true)
  }
})

const SUB_A = 'https://push.example.com/a'
const SUB_B = 'https://push.example.com/b'
const SUB_NEW = 'https://push.example.com/new'

const fakePushManager = (subscription = null) => {
  const pushManager = {
    subscription,
    gate: null,
    getSubscriptionCalls: 0,
    subscribeCalls: [],
    async getSubscription () {
      pushManager.getSubscriptionCalls++
      if (pushManager.gate) await pushManager.gate.promise
      return pushManager.subscription
    },
    subscribe (options) {
      pushManager.subscribeCalls.push(options)
      pushManager.subscription = fakeSubscription(SUB_NEW, OTHER_KEY)
      return Promise.resolve(pushManager.subscription)
    }
  }
  return pushManager
}

// Deterministic; the real (WebCrypto) hash is only used where the report is awaited
const fakeSubscriptionId = (info) => Promise.resolve(`sub:${info.endpoint}`)

const harness = ({ readyState = SOCKET.OPEN, subscription = null, pushManager = fakePushManager(subscription), getSubscriptionId = fakeSubscriptionId, ...options } = {}) => {
  const clock = fakeClock()
  const env = { client: fakeClient(readyState), loggedIn: true, disabled: false }
  const t = { clock, env, pushManager }
  t.reporter = createPushReporter({
    getPubsub: () => env.client,
    pushManager,
    isLoggedIn: () => typeof env.loggedIn === 'function' ? env.loggedIn() : env.loggedIn,
    notificationsDisabled: () => env.disabled,
    getSubscriptionId,
    now: clock.now,
    timers: clock.timers,
    ...options
  })
  t.report = (subscription) => t.reporter.reportExistingSubscription(subscription?.toJSON(), subscription?.options.applicationServerKey)
  // What the pubsub client does on a reconnection: a new socket, then
  // `PUBSUB_RECONNECTION_SUCCEEDED`
  t.reconnect = () => {
    env.client.socket = fakeSocket(SOCKET.OPEN)
    return t.reporter.onReconnected(env.client)
  }
  return t
}

const sendPublicKey = (t, key) => t.reporter.onPushAction({ data: { type: PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY, data: key } })

describe('push reporter', () => {
  const logs = silenceConsole()
  const messages = (level) => logs.filter(log => !level || log.level === level).map(({ args }) => args.map(String).join(' '))

  describe('reportExistingSubscription', () => {
    it('reports a subscription once per socket', async () => {
      const t = harness({ getSubscriptionId })
      const firstSocket = t.env.client.socket
      const subscription = fakeSubscription(SUB_A)

      assert.equal(await t.report(subscription), true)
      assert.deepEqual(firstSocket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
      const { payload } = firstSocket.sent[0].data
      assert.equal(payload.subscriptionInfo.endpoint, SUB_A)
      assert.equal(payload.applicationServerKey, Buffer.from(KEY).toString('base64'))
      assert.equal(payload.settings.heartbeatInterval, 12 * 60 * 60 * 1000)
      // The real subscription ID (a UUID) is logged
      assert.ok(messages('info').some(line => /^\[reportExistingSubscription\] reporting '[0-9a-f]{8}-[0-9a-f]{4}-/.test(line)))

      assert.equal(await t.report(subscription), true)
      assert.equal(firstSocket.sent.length, 1)

      // A new connection is a new pairing
      t.env.client.socket = fakeSocket(SOCKET.OPEN)
      assert.equal(await t.report(subscription), true)
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
      assert.equal(firstSocket.sent.length, 1)
    })

    it('reports a changed endpoint and a removal', async () => {
      const t = harness()
      const socket = t.env.client.socket

      await t.report(fakeSubscription(SUB_A))
      await t.report(fakeSubscription(SUB_B))
      assert.equal(await t.report(null), true)
      await t.report(null)
      assert.deepEqual(socket.actions(), [
        PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
        PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION,
        PUSH_SERVER_ACTION_TYPE.DELETE_SUBSCRIPTION
      ])
      assert.equal(socket.sent[1].data.payload.subscriptionInfo.endpoint, SUB_B)
      assert.equal(socket.sent[2].data.payload, null)
      assert.ok(messages('info').some(line => line.startsWith('[reportExistingSubscription] removing subscription')))
    })

    it('does not remove a subscription the socket never got', async () => {
      const t = harness()
      assert.equal(await t.report(null), true)
      assert.deepEqual(t.env.client.socket.sent, [])
    })

    for (const [name, readyState] of [['connecting', SOCKET.CONNECTING], ['closing', SOCKET.CLOSING], ['closed', SOCKET.CLOSED]]) {
      it(`resolves to false while the socket is ${name}, then reports on reconnection`, async () => {
        const subscription = fakeSubscription(SUB_A)
        const t = harness({ readyState, subscription })
        const oldSocket = t.env.client.socket

        assert.equal(await t.report(subscription), false)
        assert.deepEqual(oldSocket.sent, [])
        assert.ok(messages('info').some(line => line.includes('will be reported once reconnected')))
        assert.deepEqual(messages('error'), [])

        if (readyState === SOCKET.CONNECTING) {
          // The same socket opens
          oldSocket.readyState = SOCKET.OPEN
          await t.reporter.onReconnected(t.env.client)
          assert.deepEqual(oldSocket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
        } else {
          await t.reconnect()
          assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
          assert.deepEqual(oldSocket.sent, [])
        }
      })
    }

    it('resolves to false without a pubsub client', async () => {
      const t = harness()
      t.env.client = null
      assert.equal(await t.report(fakeSubscription(SUB_A)), false)
    })

    it('sends a report made while an earlier one was being built, even if the earlier one was not sent', async () => {
      const gate = deferred()
      const t = harness({
        getSubscriptionId: async (info) => {
          if (info.endpoint === SUB_A) await gate.promise
          return `sub:${info.endpoint}`
        }
      })
      const first = t.report(fakeSubscription(SUB_A))
      await settle()
      const second = t.report(fakeSubscription(SUB_B))
      t.env.client.socket = fakeSocket(SOCKET.OPEN)
      gate.resolve()
      assert.equal(await first, false)
      assert.equal(await second, true)
      const endpoints = t.env.client.socket.sent.map(message => message.data.payload.subscriptionInfo.endpoint)
      assert.deepEqual(endpoints, [SUB_B])
    })

    it('sends nothing on a socket replaced while building the message', async () => {
      const gate = deferred()
      const t = harness({
        subscription: fakeSubscription(SUB_A),
        getSubscriptionId: async () => {
          await gate.promise
          return 'subID'
        }
      })
      const oldSocket = t.env.client.socket

      const result = t.report(fakeSubscription(SUB_A))
      await settle()
      const newSocket = fakeSocket(SOCKET.CONNECTING)
      t.env.client.socket = newSocket
      gate.resolve()
      assert.equal(await result, false)
      assert.deepEqual(oldSocket.sent, [])
      assert.deepEqual(newSocket.sent, [])

      // Not recorded for any socket: the reconnection reports it
      newSocket.readyState = SOCKET.OPEN
      await t.reporter.onReconnected(t.env.client)
      assert.deepEqual(newSocket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
    })

    it('sends nothing on a socket that closed while building the message', async () => {
      const gate = deferred()
      const t = harness({
        getSubscriptionId: async () => {
          await gate.promise
          return 'subID'
        }
      })
      const socket = t.env.client.socket

      const result = t.report(fakeSubscription(SUB_A))
      await settle()
      socket.readyState = SOCKET.CLOSING
      gate.resolve()
      assert.equal(await result, false)
      assert.deepEqual(socket.sent, [])
    })

    it('handles concurrent reports one at a time, ending with the latest one', async () => {
      const t = harness()
      const socket = t.env.client.socket

      const results = await Promise.all([
        t.report(fakeSubscription(SUB_A)),
        t.report(fakeSubscription(SUB_A)),
        t.report(fakeSubscription(SUB_B))
      ])
      assert.deepEqual(results, [true, true, true])
      assert.deepEqual(socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
      assert.equal(socket.sent[0].data.payload.subscriptionInfo.endpoint, SUB_B)
    })

    it('keeps working after getSubscriptionId fails', async () => {
      const t = harness({ getSubscriptionId: () => Promise.reject(new Error('bad keys')) })
      assert.equal(await t.report(fakeSubscription(SUB_A)), true)
      assert.equal(t.env.client.socket.sent.length, 1)
      assert.ok(messages('info').some(line => line.includes("'ERR: bad keys'")))
    })
  })

  describe('getSubscriptionOptions', () => {
    it('requests the VAPID key and caches it for an hour', async () => {
      const t = harness()
      const socket = t.env.client.socket

      const options = t.reporter.getSubscriptionOptions()
      assert.deepEqual(socket.actions(), [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY])
      sendPublicKey(t, base64url(KEY))
      assert.deepEqual(await options, { userVisibleOnly: true, applicationServerKey: base64url(KEY) })
      assert.equal(t.clock.pendingTimers(), 0)

      t.clock.advance(VAPID_CACHE_DURATION - 1)
      assert.deepEqual(await t.reporter.getSubscriptionOptions(), { userVisibleOnly: true, applicationServerKey: base64url(KEY) })
      assert.equal(socket.sent.length, 1)

      t.clock.advance(1)
      const refreshed = t.reporter.getSubscriptionOptions()
      assert.equal(socket.sent.length, 2)
      sendPublicKey(t, base64url(KEY))
      await refreshed
    })

    it('answers every request waiting for the key', async () => {
      const t = harness()
      const requests = [t.reporter.getSubscriptionOptions(), t.reporter.getSubscriptionOptions()]
      sendPublicKey(t, base64url(KEY))
      const answers = await Promise.all(requests)
      assert.deepEqual(answers.map(answer => answer.applicationServerKey), [base64url(KEY), base64url(KEY)])
      assert.equal(t.clock.pendingTimers(), 0)
    })

    for (const [name, readyState] of [['connecting', SOCKET.CONNECTING], ['closing', SOCKET.CLOSING], ['closed', SOCKET.CLOSED]]) {
      it(`rejects without sending or waiting while the socket is ${name}`, async () => {
        const t = harness({ readyState })
        await assert.rejects(t.reporter.getSubscriptionOptions(), { name: PUBSUB_NOT_OPEN_ERROR, message: 'WebSocket connection is not open' })
        assert.deepEqual(t.env.client.socket.sent, [])
        assert.equal(t.clock.pendingTimers(), 0)
      })
    }

    it('rejects without a pubsub client', async () => {
      const t = harness()
      t.env.client = null
      await assert.rejects(t.reporter.getSubscriptionOptions(), { name: PUBSUB_NOT_OPEN_ERROR, message: 'Missing pubsub instance' })
      assert.equal(t.clock.pendingTimers(), 0)
    })

    it('rejects with a plain error when the key does not arrive in time on an open socket', async () => {
      const t = harness()
      const options = t.reporter.getSubscriptionOptions()
      t.clock.advance(VAPID_REQUEST_TIMEOUT)
      await assert.rejects(options, { name: 'Error', message: 'Timed out requesting VAPID key' })
      assert.equal(t.clock.pendingTimers(), 0)

      // A late answer is still cached
      sendPublicKey(t, base64url(KEY))
      assert.deepEqual(await t.reporter.getSubscriptionOptions(), { userVisibleOnly: true, applicationServerKey: base64url(KEY) })
      assert.equal(t.env.client.socket.sent.length, 1)
    })

    for (const [name, loseSocket] of [
      ['closed', (t) => { t.env.client.socket.readyState = SOCKET.CLOSED }],
      ['replaced', (t) => { t.env.client.socket = fakeSocket(SOCKET.OPEN) }],
      ['gone with its client', (t) => { t.env.client = null }]
    ]) {
      it(`rejects as not connected when the socket was ${name} while waiting for the key`, async () => {
        const t = harness()
        const options = t.reporter.getSubscriptionOptions()
        loseSocket(t)
        t.clock.advance(VAPID_REQUEST_TIMEOUT)
        await assert.rejects(options, { name: PUBSUB_NOT_OPEN_ERROR, message: 'Timed out requesting VAPID key' })
        assert.equal(t.clock.pendingTimers(), 0)
      })
    }

    it('rejects with the send error and leaves nothing pending', async () => {
      const t = harness()
      t.env.client.socket.send = () => { throw new Error('send failed') }
      await assert.rejects(t.reporter.getSubscriptionOptions(), { message: 'send failed' })
      assert.equal(t.clock.pendingTimers(), 0)
    })
  })

  describe('onPushAction', () => {
    it('replaces the subscription when the server key changes', async () => {
      const subscription = fakeSubscription(SUB_A, KEY)
      const t = harness({ subscription })

      sendPublicKey(t, base64url(OTHER_KEY))
      await settle()
      assert.equal(subscription.unsubscribed, true)
      assert.deepEqual(t.pushManager.subscribeCalls, [{ userVisibleOnly: true, applicationServerKey: base64url(OTHER_KEY) }])
      const { sent } = t.env.client.socket
      assert.equal(sent.length, 1)
      assert.equal(sent[0].data.action, PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION)
      assert.equal(sent[0].data.payload.subscriptionInfo.endpoint, SUB_NEW)
      assert.ok(messages('warn').some(line => line.startsWith('VAPID server key changed')))
    })

    it('keeps the subscription when the key is unchanged or seen before', async () => {
      const subscription = fakeSubscription(SUB_A, KEY)
      const t = harness({ subscription })

      sendPublicKey(t, base64url(KEY))
      await settle()
      assert.equal(t.pushManager.getSubscriptionCalls, 1)
      sendPublicKey(t, base64url(KEY))
      await settle()
      assert.equal(t.pushManager.getSubscriptionCalls, 1)
      assert.equal(subscription.unsubscribed, false)
      assert.deepEqual(t.pushManager.subscribeCalls, [])
    })

    it('only removes the subscription when logged out or with notifications disabled', async () => {
      for (const setup of [(env) => { env.loggedIn = false }, (env) => { env.disabled = true }]) {
        const subscription = fakeSubscription(SUB_A, KEY)
        const t = harness({ subscription })
        setup(t.env)
        sendPublicKey(t, base64url(OTHER_KEY))
        await settle()
        assert.equal(subscription.unsubscribed, true)
        assert.deepEqual(t.pushManager.subscribeCalls, [])
        assert.deepEqual(t.env.client.socket.sent, [])
      }
    })

    it('ignores other actions and never throws', async () => {
      const pushManager = fakePushManager()
      let getSubscriptionCalls = 0
      pushManager.getSubscription = () => {
        getSubscriptionCalls++
        return Promise.reject(new Error('no push service'))
      }
      const t = harness({ pushManager })
      const socket = t.env.client.socket

      t.reporter.onPushAction({ data: { type: 'other' } })
      t.reporter.onPushAction({ data: null })
      t.reporter.onPushAction({})
      await settle()
      assert.equal(getSubscriptionCalls, 0, 'no re-subscription')
      // Nothing was cached: the key is still requested
      const options = t.reporter.getSubscriptionOptions()
      assert.deepEqual(socket.actions(), [PUSH_SERVER_ACTION_TYPE.SEND_PUBLIC_KEY])

      sendPublicKey(t, base64url(KEY))
      await options
      await settle()
      assert.equal(getSubscriptionCalls, 1)
      assert.equal(messages('error').filter(line => line.includes('no push service')).length, 1)
    })

    it('logs a failed unsubscribe and subscribes nothing', async () => {
      const subscription = fakeSubscription(SUB_A, KEY)
      subscription.unsubscribe = () => Promise.reject(new Error('unsubscribe failed'))
      const t = harness({ subscription })

      sendPublicKey(t, base64url(OTHER_KEY))
      await settle()
      assert.deepEqual(t.pushManager.subscribeCalls, [])
      assert.deepEqual(t.env.client.socket.sent, [])
      const errors = messages('error').filter(line => line.includes('Error re-subscribing after a VAPID key change') && line.includes('unsubscribe failed'))
      assert.equal(errors.length, 1)
    })
  })

  describe('onReconnected', () => {
    it('reports the browser subscription on every reconnection', async () => {
      const t = harness({ subscription: fakeSubscription(SUB_A) })
      await t.reconnect()
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
      await t.reconnect()
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
    })

    it('does nothing when logged out, with notifications disabled or without a push manager', async () => {
      const t = harness({ subscription: fakeSubscription(SUB_A) })
      t.env.loggedIn = false
      await t.reconnect()
      t.env.loggedIn = true
      t.env.disabled = true
      await t.reconnect()
      assert.equal(t.pushManager.getSubscriptionCalls, 0)
      assert.deepEqual(t.env.client.socket.sent, [])

      const withoutPush = harness({ pushManager: null })
      await withoutPush.reconnect()
      assert.deepEqual(withoutPush.env.client.socket.sent, [])
    })

    it('ignores reconnections of a client that is not the current one', async () => {
      const t = harness({ subscription: fakeSubscription(SUB_A) })
      await t.reporter.onReconnected(fakeClient(SOCKET.OPEN))
      assert.equal(t.pushManager.getSubscriptionCalls, 0)
    })

    it('reports a reconnection that happens during a slow getSubscription()', async () => {
      const t = harness({ subscription: fakeSubscription(SUB_A) })
      t.pushManager.gate = deferred()
      const first = t.reconnect()
      await settle()
      const firstSocket = t.env.client.socket
      const second = t.reconnect()
      t.pushManager.gate.resolve()
      await Promise.all([first, second])

      assert.equal(t.pushManager.getSubscriptionCalls, 2)
      assert.deepEqual(firstSocket.sent, [])
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
    })

    it('reports a reconnection that happens while the report is being built', async () => {
      const gate = deferred()
      const t = harness({
        subscription: fakeSubscription(SUB_A),
        getSubscriptionId: async () => {
          await gate.promise
          return 'subID'
        }
      })
      const first = t.reconnect()
      const firstSocket = t.env.client.socket
      await settle()
      const second = t.reconnect()
      gate.resolve()
      await Promise.all([first, second])

      assert.deepEqual(firstSocket.sent, [])
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
    })

    for (const [name, report, expected] of [
      ['a removal', null, []],
      ['another subscription', SUB_B, [SUB_B]]
    ]) {
      it(`keeps ${name} reported by a tab while it reads the browser's subscription`, async () => {
        const t = harness({ subscription: fakeSubscription(SUB_A) })
        t.pushManager.gate = deferred()
        const reconnecting = t.reconnect()
        await settle()
        // Notifications were just turned off, or a new subscription created
        if (!report) t.env.disabled = true
        const reported = t.report(report && fakeSubscription(report))
        t.pushManager.gate.resolve()
        await reconnecting
        assert.equal(await reported, true)
        const endpoints = t.env.client.socket.sent.map(message => message.data.payload.subscriptionInfo.endpoint)
        assert.deepEqual(endpoints, expected)
      })
    }

    it('never rejects', async () => {
      const t = harness({ subscription: fakeSubscription(SUB_A) })
      t.env.loggedIn = () => { throw new Error('no root state') }
      await t.reconnect()
      t.env.loggedIn = true
      t.pushManager.getSubscription = () => Promise.reject(new Error('no push service'))
      await t.reconnect()
      assert.ok(messages('error').some(line => line.includes('no root state')))
      assert.ok(messages('error').some(line => line.includes('no push service')))

      // Still usable afterwards
      t.pushManager.getSubscription = () => Promise.resolve(fakeSubscription(SUB_A))
      await t.reconnect()
      assert.deepEqual(t.env.client.socket.actions(), [PUSH_SERVER_ACTION_TYPE.STORE_SUBSCRIPTION])
    })
  })

  describe('bufferEq', () => {
    it('compares base64url strings and buffers', () => {
      assert.equal(bufferEq(base64url(KEY), KEY.slice().buffer), true)
      assert.equal(bufferEq(KEY, KEY.slice()), true)
      assert.equal(bufferEq(base64url(KEY), OTHER_KEY), false)
      assert.equal(bufferEq(KEY, KEY.slice(1)), false)
      assert.equal(bufferEq(null, undefined), true)
      assert.equal(bufferEq(KEY, null), false)
    })
  })
})
