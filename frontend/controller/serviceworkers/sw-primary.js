'use strict'

import { MESSAGE_RECEIVE, MESSAGE_SEND, PROPOSAL_ARCHIVED } from '@model/contracts/shared/constants.js'
import '@model/swCaptureLogs.js'
import '@sbp/okturtles.data'
import '@sbp/okturtles.eventqueue'
import '@sbp/okturtles.events'
import sbp from '@sbp/sbp'
import '~/frontend/controller/actions/index.js'
import './sw-namespace.js'
import chatroomGetters from '~/frontend/model/chatroom/getters.js'
import getters from '~/frontend/model/getters.js'
import '~/frontend/model/notifications/selectors.js'
import setupChelonia from '~/frontend/setupChelonia.js'
import { KV_KEYS } from '~/frontend/utils/constants.js'
import { CHELONIA_STATE_MODIFIED, LOGIN, LOGIN_ERROR, LOGOUT } from '~/frontend/utils/events.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { CHELONIA_RESET, CONTRACTS_MODIFIED, CONTRACT_IS_SYNCING, EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { deserializer, serializer } from '~/shared/serdes/index.js'
import {
  ACCEPTED_GROUP, CAPTURED_LOGS, CHATROOM_USER_STOP_TYPING,
  CHATROOM_USER_TYPING, DELETED_CHATROOM, JOINED_CHATROOM, JOINED_GROUP,
  KV_EVENT, LEFT_CHATROOM, LEFT_GROUP, NAMESPACE_REGISTRATION,
  NEW_CHATROOM_UNREAD_POSITION, NEW_LAST_LOGGED_IN, NEW_PREFERENCES,
  NEW_UNREAD_MESSAGES, NOTIFICATION_EMITTED, NOTIFICATION_REMOVED,
  NOTIFICATION_STATUS_LOADED, OFFLINE, ONLINE, SERIOUS_ERROR, SWITCH_GROUP
} from '../../utils/events.js'
import './push.js'

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
  console.debug(`[sbp] ${selector}`, data)
})

// This function sets up state keys used in the SW that mirror the corresponding
// Vuex keys
const setupRootState = () => {
  const rootState = sbp('chelonia/rootState')

  if (!rootState.chatroom) rootState.chatroom = Object.create(null)
  if (!rootState.chatroom.chatRoomScrollPosition) rootState.chatroom.chatRoomScrollPosition = Object.create(null)
  if (!rootState.chatroom.unreadMessages) rootState.chatroom.unreadMessages = Object.create(null)

  if (!rootState.lastLoggedIn) rootState.lastLoggedIn = Object.create(null)

  if (!rootState.notifications) rootState.notifications = Object.create(null)
  if (!rootState.notifications.items) rootState.notifications.items = []
  if (!rootState.notifications.status) rootState.notifications.status = Object.create(null)
}

sbp('okTurtles.events/on', CHELONIA_RESET, setupRootState)

// These are all of the events that will be forwarded to all open tabs and windows
;[
  CHELONIA_RESET, CONTRACTS_MODIFIED, CONTRACT_IS_SYNCING, EVENT_HANDLED, LOGIN,
  LOGIN_ERROR, LOGOUT, ACCEPTED_GROUP, CHATROOM_USER_STOP_TYPING,
  CHATROOM_USER_TYPING, DELETED_CHATROOM, LEFT_CHATROOM, LEFT_GROUP,
  JOINED_CHATROOM, JOINED_GROUP, KV_EVENT, MESSAGE_RECEIVE, MESSAGE_SEND,
  NAMESPACE_REGISTRATION, NEW_CHATROOM_UNREAD_POSITION, NEW_LAST_LOGGED_IN,
  NEW_PREFERENCES, NEW_UNREAD_MESSAGES, NOTIFICATION_EMITTED,
  NOTIFICATION_REMOVED, NOTIFICATION_STATUS_LOADED, OFFLINE, ONLINE,
  PROPOSAL_ARCHIVED, SERIOUS_ERROR, SWITCH_GROUP
].forEach(et => {
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

// Logs are treated especially to avoid spamming logs with event emitted
// entries
sbp('okTurtles.events/on', CAPTURED_LOGS, (...args) => {
  const { data } = serializer(args)
  const message = {
    type: CAPTURED_LOGS,
    data
  }
  self.clients.matchAll()
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage(message)
      })
    })
})

sbp('sbp/selectors/register', {
  'state/vuex/state': () => sbp('chelonia/rootState'),
  'state/vuex/getters': (() => {
    // Singleton lazily generated getters
    let obj
    return () => {
      if (!obj) {
        obj = Object.create(null)
        Object.defineProperties(obj, Object.fromEntries(Object.entries(getters).map(([getter, fn]: [string, Function]) => {
          return [getter, {
            get: () => {
              const state = sbp('chelonia/rootState')
              return fn(state, obj)
            }
          }]
        })))
        Object.defineProperties(obj, Object.fromEntries(Object.entries(chatroomGetters).map(([getter, fn]: [string, Function]) => {
          return [getter, {
            get: () => {
              const state = sbp('chelonia/rootState')
              // `state.chatroom` represents the `chatroom` module. For the SW,
              // this is defined in `sw-primary.js`.
              return fn(state.chatroom || {}, obj, state)
            }
          }]
        })))
      }

      return obj
    }
  })()
})

const x = new URL(self.location)

sbp('sbp/selectors/register', {
  'controller/router': () => {
    return { options: { base: x.searchParams.get('routerBase') } }
  }
})

sbp('sbp/selectors/register', {
  'appLogs/save': () => sbp('swLogs/save')
})

setupRootState()
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
/* const store = {}
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
*/

self.addEventListener('message', function (event) {
  console.debug(`[sw] message from ${event.source.id} of type ${event.data?.type}.`)
  // const client = await self.clients.get(event.source.id)
  // const client = await self.clients.get(event.clientId)
  if (typeof event.data === 'object' && event.data.type) {
    console.debug('[sw] event received:', event.data)
    switch (event.data.type) {
      case 'sbp': {
        // We don't filter the selectors because such a filter would be
        // difficult to implement and easy to circumvent.
        const port = event.data.port
        ;(async () => await sbp(...deserializer(event.data.data)))().then((r) => {
          const { data, transferables } = serializer(r)
          port.postMessage([true, data], transferables)
        }).catch((e) => {
          const { data, transferables } = serializer(e)
          port.postMessage([false, data], transferables)
        }).finally(() => {
          port.close()
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
  event.notification.close()

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      clientList.sort((a, b) => {
        if (a.focused !== b.focused) {
          return a.focused ? -1 : 1
        }
        if (a.visibilityState !== b.visibilityState) {
        // order is visible, prerender, hidden
          if (a.visibilityState === 'visible') return -1
          if (b.visibilityState === 'visible') return 1
          if (a.visibilityState === 'hidden') return 1
          if (b.visibilityState === 'hidden') return -1
        }

        return 0
      })
      if (!clientList.length) {
        return self.clients.openWindow(`${sbp('controller/router').options.base}${event.notification.data.path ?? '/'}`)
      }
      const client = clientList[0]
      if (event.notification.data?.path) {
        client.postMessage({
          type: 'navigate',
          path: event.notification.data.path
        })
      }
      if (!client.focused) return client.focus()
    }))
})

sbp('okTurtles.events/on', KV_EVENT, ({ contractID, key, data }) => {
  const rootState = sbp('chelonia/rootState')
  const ourIdentityContractID = rootState.loggedIn?.identityContractID
  if (contractID !== ourIdentityContractID) return
  // the following keys mirror the corresponding keys in Vuex modules in the
  // app
  switch (key) {
    case KV_KEYS.LAST_LOGGED_IN: {
      rootState.lastLoggedIn[contractID] = data
      break
    }
    case KV_KEYS.UNREAD_MESSAGES: {
      rootState.chatroom.unreadMessages = data
      break
    }
    case KV_KEYS.PREFERENCES: {
      rootState.preferences = data
      break
    }
    case KV_KEYS.NOTIFICATIONS: {
      rootState.notifications.status = data
      break
    }
    default:
      return
  }
  sbp('okTurtles.events/emit', CHELONIA_STATE_MODIFIED)
})

sbp('okTurtles.events/on', NEW_CHATROOM_UNREAD_POSITION, ({ chatRoomID, messageHash }) => {
  const rootState = sbp('chelonia/rootState')
  if (messageHash) {
    rootState.chatroom.chatRoomScrollPosition[chatRoomID] = messageHash
  } else {
    delete rootState.chatroom.chatRoomScrollPosition[chatRoomID]
  }
  sbp('okTurtles.events/emit', CHELONIA_STATE_MODIFIED)
})
