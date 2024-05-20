'use strict'

// https://serviceworke.rs/message-relay_service-worker_doc.html
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// https://jakearchibald.com/2014/using-serviceworker-today/
// https://github.com/w3c/ServiceWorker/blob/master/explainer.md
// https://frontendian.co/service-workers
// https://stackoverflow.com/a/49748437 => https://medium.com/@nekrtemplar/self-destroying-serviceworker-73d62921d717 => https://love2dev.com/blog/how-to-uninstall-a-service-worker/

import sbp from '@sbp/sbp'
import '~/shared/domains/chelonia/chelonia.js'
import manifests from '@model/contracts/manifests.json'
import * as Common from '@common/common.js'
import { debounce, has } from '@model/contracts/shared/giLodash.js'
import { NOTIFICATION_TYPE, REQUEST_TYPE } from '~/shared/pubsub.js'
import { PUBSUB_INSTANCE } from '../instance-keys.js'
import { CONTRACT_IS_SYNCING, CONTRACTS_MODIFIED, EVENT_HANDLED } from '~/shared/domains/chelonia/events.js'
import { LOGIN, LOGIN_ERROR, LOGOUT } from '~/frontend/utils/events.js'
import { CHATROOM_USER_TYPING, CHATROOM_USER_STOP_TYPING, JOINED_GROUP, SWITCH_GROUP } from '../../utils/events.js'
import '@sbp/okturtles.data'
import '../namespace.js'
import '../actions/index.js'
import '../../views/utils/avatar.js'
import { serializer, deserializer } from '~/shared/serdes/index.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { GIMessage } from '~/shared/domains/chelonia/GIMessage.js'

deserializer.register(GIMessage)
deserializer.register(Secret)

sbp('sbp/filters/global/add', (domain, selector, data) => {
  // if (domainBlacklist[domain] || selectorBlacklist[selector]) return
  if (selector.includes('wait')) console.error(`[sbp] ${selector}`, data)
  console.debug(`[sbp] ${selector}`, data)
})

// this is to ensure compatibility between frontend and test/backend.test.js
sbp('okTurtles.data/set', 'API_URL', self.location.origin)

sbp('sbp/selectors/register', {
  'state/vuex/state': () => {
    // TODO: Remove this selector once it's removed from contracts
    return sbp('chelonia/rootState')
  },
  'state/vuex/reset': () => {
    console.error('[sw] CALLED state/vuex/reset WHICH IS UNDEFINED')
  },
  'state/vuex/save': () => {
    console.error('[sw] CALLED state/vuex/save WHICH IS UNDEFINED')
  },
  'state/vuex/commit': () => {
    console.error('[sw] CALLED state/vuex/commit WHICH IS UNDEFINED')
  }
})

sbp('chelonia/rootState').namespaceLookups = Object.create(null)

// Use queueInvocation to prevent 'save' calls to persist after calling
// `'chelonia/reset'`
const save = debounce(() => sbp('chelonia/queueInvocation', 'CHELONIA_STATE', () => {
  return sbp('gi.db/settings/save', 'CHELONIA_STATE', sbp('chelonia/rootState')).catch(e => {
    console.error('Error saving Chelonia state', e)
  })
}), 500)

sbp('chelonia/configure', {
  connectionURL: sbp('okTurtles.data/get', 'API_URL'),
  reactiveSet: (o: Object, k: string, v: string) => {
    if (!has(o, k) || o[k] !== v) {
      o[k] = v
      save()
    }
  },
  reactiveDel: (o: Object, k: string) => {
    if (has(o, k)) {
      delete o[k]
      save()
    }
  },
  contracts: {
    ...manifests,
    defaults: {
      modules: { '@common/common.js': Common },
      allowedSelectors: [
        'namespace/lookup', 'namespace/lookupCached',
        'state/vuex/state', 'state/vuex/settings', 'state/vuex/commit', 'state/vuex/getters',
        'chelonia/contract/state',
        'chelonia/contract/sync', 'chelonia/contract/isSyncing', 'chelonia/contract/remove', 'chelonia/contract/retain', 'chelonia/contract/release', 'controller/router',
        'chelonia/contract/suitableSigningKey', 'chelonia/contract/currentKeyIdByName',
        'chelonia/storeSecretKeys', 'chelonia/crypto/keyId',
        'chelonia/queueInvocation',
        'chelonia/contract/waitingForKeyShareTo',
        'chelonia/contract/successfulKeySharesByContractID',
        'gi.actions/chatroom/leave',
        'gi.actions/group/removeOurselves', 'gi.actions/group/groupProfileUpdate', 'gi.actions/group/displayMincomeChangedPrompt', 'gi.actions/group/addChatRoom',
        'gi.actions/group/join', 'gi.actions/group/joinChatRoom',
        'gi.actions/identity/addJoinDirectMessageKey', 'gi.actions/identity/leaveGroup',
        'gi.notifications/emit',
        'gi.actions/out/rotateKeys', 'gi.actions/group/shareNewKeys', 'gi.actions/chatroom/shareNewKeys', 'gi.actions/identity/shareNewPEK',
        'chelonia/out/keyDel',
        'chelonia/contract/disconnect',
        'gi.actions/identity/removeFiles',
        'gi.actions/chatroom/join',
        'chelonia/contract/hasKeysToPerformOperation'
      ],
      allowedDomains: ['okTurtles.data', 'okTurtles.events', 'okTurtles.eventQueue', 'gi.db', 'gi.contracts'],
      preferSlim: true,
      exposedGlobals: {
        // note: needs to be written this way and not simply "Notification"
        // because that breaks on mobile where Notification is undefined
        // Notification: window.Notification
      }
    }
  }
  /* hooks: {
    handleEventError: (e: Error, message: GIMessage) => {
      if (e.name === 'ChelErrorUnrecoverable') {
        sbp('gi.ui/seriousErrorBanner', e)
      }
      if (sbp('okTurtles.data/get', 'sideEffectError') !== message.hash()) {
        // Avoid duplicate notifications for the same message.
        errorNotification('handleEvent', e, message)
      }
    },
    processError: (e: Error, message: GIMessage, msgMeta: { signingKeyId: string, signingContractID: string, innerSigningKeyId: string, innerSigningContractID: string }) => {
      if (e.name === 'GIErrorIgnoreAndBan') {
        sbp('okTurtles.eventQueue/queueEvent', message.contractID(), [
          'gi.actions/group/autobanUser', message, e, msgMeta
        ])
      }
      // For now, we ignore all missing keys errors
      if (e.name === 'ChelErrorDecryptionKeyNotFound') {
        return
      }
      errorNotification('process', e, message)
    },
    sideEffectError: (e: Error, message: GIMessage) => {
      sbp('gi.ui/seriousErrorBanner', e)
      sbp('okTurtles.data/set', 'sideEffectError', message.hash())
      errorNotification('sideEffect', e, message)
    }
  } */
})

sbp('okTurtles.events/on', EVENT_HANDLED, (contractID) => {
  const message = {
    type: 'event',
    subtype: EVENT_HANDLED,
    data: [contractID]
  }
  self.clients.matchAll()
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage(message)
      })
    })
})

sbp('okTurtles.events/on', CONTRACTS_MODIFIED, (subscriptionSet) => {
  const message = {
    type: 'event',
    subtype: CONTRACTS_MODIFIED,
    data: [subscriptionSet]
  }
  self.clients.matchAll()
    .then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage(message)
      })
    })
});

[CONTRACTS_MODIFIED, CONTRACT_IS_SYNCING, LOGIN, LOGIN_ERROR, LOGOUT, JOINED_GROUP, SWITCH_GROUP].forEach(et => {
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

sbp('okTurtles.data/set', PUBSUB_INSTANCE, sbp('chelonia/connect', {
  messageHandlers: {
    [NOTIFICATION_TYPE.VERSION_INFO] (msg) {
      const ourVersion = process.env.GI_VERSION
      const theirVersion = msg.data.GI_VERSION

      const ourContractsVersion = process.env.CONTRACTS_VERSION
      const theirContractsVersion = msg.data.CONTRACTS_VERSION
      if (ourVersion !== theirVersion || ourContractsVersion !== theirContractsVersion) {
        sbp('okTurtles.events/emit', NOTIFICATION_TYPE.VERSION_INFO, { ...msg.data })
      }
    },
    [REQUEST_TYPE.PUSH_ACTION] (msg) {
      sbp('okTurtles.events/emit', REQUEST_TYPE.PUSH_ACTION, { data: msg.data })
    },
    [NOTIFICATION_TYPE.PUB] (msg) {
      const { contractID, innerSigningContractID, data } = msg

      switch (data[0]) {
        case 'gi.contracts/chatroom/user-typing-event': {
          sbp('okTurtles.events/emit', CHATROOM_USER_TYPING, { contractID, innerSigningContractID })
          break
        }
        case 'gi.contracts/chatroom/user-stop-typing-event': {
          sbp('okTurtles.events/emit', CHATROOM_USER_STOP_TYPING, { contractID, innerSigningContractID })
          break
        }
        default: {
          console.log(`[pubsub] Received data from channel ${contractID}:`, data)
        }
      }
    },
    [NOTIFICATION_TYPE.KV] ([key, data]) {
      switch (key) {
        case 'lastLoggedIn': {
          // TODO THIS
          // const rootState = sbp('state/vuex/state')
          // Vue.set(rootState.lastLoggedIn, data.contractID, data.data)
        }
      }
    }
  }
}))

self.addEventListener('install', function (event) {
  console.debug('[sw] install')
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', function (event) {
  console.debug('[sw] activate')

  // 'clients.claim()' reference: https://web.dev/articles/service-worker-lifecycle#clientsclaim
  event.waitUntil(self.clients.claim())
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
        console.error('@@@@[sw] sbp', event)
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
