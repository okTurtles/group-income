'use strict'

// https://serviceworke.rs/message-relay_service-worker_doc.html
// https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
// https://jakearchibald.com/2014/using-serviceworker-today/
// https://github.com/w3c/ServiceWorker/blob/master/explainer.md
// https://frontendian.co/service-workers
// https://stackoverflow.com/a/49748437 => https://medium.com/@nekrtemplar/self-destroying-serviceworker-73d62921d717 => https://love2dev.com/blog/how-to-uninstall-a-service-worker/

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
