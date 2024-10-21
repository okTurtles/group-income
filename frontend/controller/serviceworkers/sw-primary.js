'use strict'

import { PROPOSAL_ARCHIVED } from '@model/contracts/shared/constants.js'
import '@model/swCaptureLogs.js'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import '~/frontend/controller/actions/index.js'
import '~/frontend/controller/sw-namespace.js'
import getters from '~/frontend/model/getters.js'
import '~/frontend/model/notifications/selectors.js'
import setupChelonia from '~/frontend/setupChelonia.js'
import { LOGIN, LOGIN_ERROR, LOGOUT } from '~/frontend/utils/events.js'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { CONTRACTS_MODIFIED, CONTRACT_IS_SYNCING, EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { deserializer, serializer } from '~/shared/serdes/index.js'
import { ACCEPTED_GROUP, DELETED_CHATROOM, JOINED_CHATROOM, JOINED_GROUP, KV_EVENT, LEFT_CHATROOM, LEFT_GROUP, NAMESPACE_REGISTRATION, NEW_PREFERENCES, NEW_UNREAD_MESSAGES, NOTIFICATION_EMITTED, NOTIFICATION_REMOVED, NOTIFICATION_STATUS_LOADED, SERIOUS_ERROR, SWITCH_GROUP } from '../../utils/events.js'

deserializer.register(GIMessage)
deserializer.register(Secret)

// https://serviceworke.rs/message-relay_service-worker_doc.html
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// https://jakearchibald.com/2014/using-serviceworker-today/
// https://github.com/w3c/ServiceWorker/blob/master/explainer.md
// https://frontendian.co/service-workers
// https://stackoverflow.com/a/49748437 => https://medium.com/@nekrtemplar/self-destroying-serviceworker-73d62921d717 => https://love2dev.com/blog/how-to-uninstall-a-service-worker/

const reducer = (o, v) => { o[v] = true; return o }
// Domains for which debug logging won't be enabled.
const domainBlacklist = [
  'sbp',
  'okTurtles.data'
].reduce(reducer, {})
// Selectors for which debug logging won't be enabled.
const selectorBlacklist = [
  'chelonia/db/get',
  'chelonia/db/set',
  'chelonia/rootState',
  'chelonia/haveSecretKey',
  'chelonia/private/enqueuePostSyncOps',
  'chelonia/private/invoke',
  'state/vuex/state',
  'state/vuex/getters',
  'state/vuex/settings',
  'gi.db/settings/save',
  'gi.db/logs/save'
].reduce(reducer, {})
sbp('sbp/filters/global/add', (domain, selector, data) => {
  if (domainBlacklist[domain] || selectorBlacklist[selector]) return
  console.debug(`[sw] [sbp] ${selector}`, data)
});

[EVENT_HANDLED, CONTRACTS_MODIFIED, CONTRACT_IS_SYNCING, LOGIN, LOGIN_ERROR, LOGOUT, ACCEPTED_GROUP, DELETED_CHATROOM, LEFT_CHATROOM, LEFT_GROUP, JOINED_CHATROOM, JOINED_GROUP, KV_EVENT, NAMESPACE_REGISTRATION, NEW_PREFERENCES, NEW_UNREAD_MESSAGES, NOTIFICATION_EMITTED, NOTIFICATION_REMOVED, NOTIFICATION_STATUS_LOADED, PROPOSAL_ARCHIVED, SERIOUS_ERROR, SWITCH_GROUP].forEach(et => {
  sbp('okTurtles.events/on', et, (...args) => {
    const { data } = serializer(args)
    const message = {
      type: 'event',
      subtype: et,
      data
    }
    self.clients.matchAll()
      .then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage(message)
        })
      })
  })
})

sbp('sbp/selectors/register', {
  'state/vuex/state': () => sbp('chelonia/rootState'),
  'state/vuex/getters': () => {
    const obj = Object.create(null)
    Object.defineProperties(obj, Object.fromEntries(Object.entries(getters).map(([getter, fn]: [string, Function]) => {
      return [getter, {
        get: () => {
          const state = sbp('chelonia/rootState')
          return fn(state, obj)
        }
      }]
    })))

    return obj
  }
})

sbp('sbp/selectors/register', {
  'controller/router': () => {
    return { options: { base: '/app/' } }
  }
})

sbp('sbp/selectors/register', {
  'appLogs/save': () => sbp('swLogs/save')
})

const setupPromise = setupChelonia()

self.addEventListener('install', function (event) {
  console.debug('[sw] install')
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function (event) {
  console.debug('[sw] activate')

  // 'clients.claim()' reference: https://web.dev/articles/service-worker-lifecycle#clientsclaim
  event.waitUntil(setupPromise.then(() => self.clients.claim()))
})

self.addEventListener('fetch', function (event) {
  console.debug(`[sw] fetch : ${event.request.method} - ${event.request.url}`)
})

// TODO: this doesn't persist data across browser restarts, so try to use
// the cache instead, or just localstorage. Investigate whether the service worker
// has the ability to access and clear the localstorage periodically.
const store = {}
const sendMessageToClient = async function (payload) {
  if (!store.clientId) {
    console.error('[sw] Cannot send a message to a client, because no client id is found')
    return
  }

  const client = await self.clients.get(store.clientId)
  if (client) {
    client.postMessage(payload)
  }
}

self.addEventListener('message', function (event) {
  console.debug(`[sw] message from ${event.source.id}. Current store:`, store)
  // const client = await self.clients.get(event.source.id)
  // const client = await self.clients.get(event.clientId)
  if (typeof event.data === 'object' && event.data.type) {
    console.debug('[sw] event received:', event.data)
    switch (event.data.type) {
      case 'set':
        store[event.data.key] = event.data.value
        break
      case 'get':
        event.source.postMessage({
          response: store[event.data.key]
        })
        break
      case 'store-client-id':
        store.clientId = event.source.id
        break
      case 'sbp': {
        const port = event.data.port;
        (async () => await sbp(...deserializer(event.data.data)))().then((r) => {
          const { data, transferables } = serializer(r)
          port.postMessage([true, data], transferables)
        }).catch((e) => {
          const { data, transferables } = serializer(e)
          port.postMessage([false, data], transferables)
        })
        break
      }
      case 'ping':
        event.source.postMessage({ type: 'pong' })
        break
      case 'shutdown':
        self.registration.unregister()
          .then(function () {
            return self.clients.matchAll()
          })
          .then(function (clients) {
            // Force a refresh of each SW window. This ensures that the service
            // worker is completely removed
            clients.forEach(client => client.navigate(client.url))
          })
        break
      case 'event':
        sbp('okTurtles.events/emit', event.data.subtype, ...deserializer(event.data.data))
        break
      default:
        console.error('[sw] unknown message type:', event.data)
        break
    }
  } else {
    console.error('[sw] unexpected data:', event.data)
  }
})

// Handle clicks on notifications issued via registration.showNotification().
self.addEventListener('notificationclick', event => {
  console.debug('[sw] Notification clicked:', event.notification)
})

self.addEventListener('push', function (event) {
  // PushEvent reference: https://developer.mozilla.org/en-US/docs/Web/API/PushEvent

  if (!(self.Notification && self.Notification.permission === 'granted')) {
    console.debug("[sw] received a push notification but aren't displaying it due to the permission not granted")
    return
  }

  const data = event.data.json()
  console.debug('[sw] push received: ', data)

  self.registration.showNotification(
    data.title,
    {
      body: data.body || '',
      icon: '/assets/images/pwa-icons/group-income-icon-transparent.svg'
    }
  )
})

self.addEventListener('pushsubscriptionchange', async function (event) {
  // NOTE: Currently there is no specific way to validate if a push-subscription is valid. So it has to be handled in the front-end.
  // (reference:https://pushpad.xyz/blog/web-push-how-to-check-if-a-push-endpoint-is-still-valid)
  const subscription = await self.registration.pushManger.subscribe(event.oldSubscription.options)

  // Sending the client a message letting it know of the subscription change.
  await sendMessageToClient({
    type: 'pushsubscriptionchange',
    subscription
  })
})

sbp('okTurtles.events/on', KV_EVENT, ({ contractID, key, data }) => {
  const rootState = sbp('chelonia/rootState')
  switch (key) {
    case KV_KEYS.LAST_LOGGED_IN: {
      const [groupID, value] = data
      rootState.lastLoggedIn[groupID] = value
      break
    }
    case KV_KEYS.UNREAD_MESSAGES: {
      if (!rootState.chatroom) rootState.chatroom = Object.create(null)
      rootState.chatroom.unreadMessages = data
      break
    }
    case KV_KEYS.PREFERENCES: {
      rootState.preferences = data
      break
    }
    case KV_KEYS.NOTIFICATIONS: {
      if (!rootState.notifications) rootState.notifications = Object.create(null)
      rootState.notifications.status = data
      break
    }
  }
})
