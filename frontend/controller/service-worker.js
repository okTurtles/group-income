'use strict'

import { deserializer, serializer } from '@chelonia/serdes'
import { L } from '@common/common.js'
import sbp from '@sbp/sbp'
import { CAPTURED_LOGS, CONTRACT_SYNCS_RESET, LOGIN_COMPLETE, NEW_CHATROOM_NOTIFICATION_SETTINGS, NEW_CHATROOM_UNREAD_POSITION, PWA_INSTALLABLE, SET_APP_LOGS_FILTER } from '@utils/events.js'
import isPwa from '@utils/isPwa.js'
import { HOURS_MILLIS } from '~/frontend/model/contracts/shared/time.js'
import { SPMessage } from '~/shared/domains/chelonia/SPMessage.js'
import { Secret } from '~/shared/domains/chelonia/Secret.js'
import { getSubscriptionId } from '~/shared/functions.js'

const pwa = {
  deferredInstallPrompt: null,
  installed: false
}

deserializer.register(SPMessage)
deserializer.register(Secret)

// How to provide your own in-app PWA install experience:
// https://web.dev/articles/customize-install

// PWA related event handlers
// NOTE: Apparently, 'beforeinstallprompt' is not fired either when a PWA from the browser is already installed.
window.addEventListener('beforeinstallprompt', e => {
  // e.preventDefault() - uncomment this if we want to prevent the browser from displaying its own install UI.

  pwa.deferredInstallPrompt = e
  sbp('okTurtles.events/emit', PWA_INSTALLABLE)
})

const serviceWorkerMap = new WeakMap()
const waitUntilSwReady = () => {
  const promise = new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel()
    messageChannel.port1.onmessage = (event) => {
      if (event.data.type === 'ready') {
        // For backward- and forward-compatibility (`currentSyncs` may not be
        // defined in a different SW version)
        if (event.data.currentSyncs) {
          sbp('okTurtles.events/emit', CONTRACT_SYNCS_RESET, event.data.currentSyncs)
        }
        resolve()
      } else {
        reject(event.data.error)
      }
      messageChannel.port1.close()
    }
    messageChannel.port1.onmessageerror = () => {
      reject(new Error('Message error'))
      messageChannel.port1.close()
    }
    const oncontrollerchange = () => {
      navigator.serviceWorker.removeEventListener('controllerchange', oncontrollerchange, false)
      // If the SW controller has changed (e.g., because of an update), we call
      // `waitUntilSwReady` again and return the result of that call. That will
      // also populate `serviceWorkerMap`
      resolve(waitUntilSwReady())
    }
    navigator.serviceWorker.addEventListener('controllerchange', oncontrollerchange, false)

    navigator.serviceWorker.ready.then((worker) => {
      if (serviceWorkerMap.has(worker.active)) {
        resolve(serviceWorkerMap.get(worker.active))
        return
      }
      serviceWorkerMap.set(worker.active, promise)
      worker.active.postMessage({
        type: 'ready',
        port: messageChannel.port2,
        GI_VERSION: process.env.GI_VERSION
      }, [messageChannel.port2])
    }).catch((e) => {
      reject(e)
      messageChannel.port1.close()
    })
  })

  return promise
}

sbp('sbp/selectors/register', {
  'service-worker/setup': async function () {
    // setup service worker
    // TODO: move ahead with encryption stuff ignoring this service worker stuff for now
    // TODO: improve updating the sw: https://stackoverflow.com/a/49748437
    // NOTE: user should still be able to use app even if all the SW stuff fails
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service worker APIs missing')
    }

    try {
      // Using hash (#) is possible, but seems to get reset when the SW restarts
      const params = new URLSearchParams([
        ['routerBase', sbp('controller/router').options.base ?? ''],
        ['standalone', isPwa() ? '1' : '0']
      ])
      const swRegistration = await navigator.serviceWorker.register(`/assets/js/sw-primary.js?${params}`, { scope: '/' })

      // This probably happens if the SW immediately crashed after registration
      // (e.g., trying to access indexedDB if it's undefined). In any case, we
      // can't proceed when this happens and .update() below will fail. The goal
      // of this check is to provide a more useful error message.
      if (swRegistration.active == null && swRegistration.installing == null && swRegistration.waiting == null) {
        throw new Error('No valid service worker found')
      }

      // if an active service-worker exists, checks for the updates immediately first and then repeats it every 1hr
      await swRegistration.update()
      setInterval(() => sbp('service-worker/update'), HOURS_MILLIS)

      navigator.serviceWorker.addEventListener('message', event => {
        const data = event.data
        const silentEmit = sbp('sbp/selectors/fn', 'okTurtles.events/emit')

        if (typeof data === 'object' && data.type) {
          switch (data.type) {
            case 'pong':
              break
            case 'event': {
              sbp('okTurtles.events/emit', event.data.subtype, ...deserializer(event.data.data))
              break
            }
            case 'navigate': {
              if (data.groupID) {
                sbp('state/vuex/commit', 'setCurrentGroupId', { contractID: data.groupID })
              }
              sbp('controller/router').push({ path: data.path }).catch(console.warn)
              break
            }
            // `sbp` invocations from the SW to the app. Used by the
            // `notificationclick` handler for notifications that have an
            // `sbpInvocation` instead of a `linkTo` property.
            case 'sbp': {
              sbp(...deserializer(event.data.data))
              break
            }
            case CAPTURED_LOGS: {
              // Emit silently to avoid flooding logs with event emitted entries
              silentEmit(CAPTURED_LOGS, ...deserializer(event.data.data))
              break
            }
            default:
              console.error('[sw] Received unknown message type from the service worker:', data)
              break
          }
        }
      })

      // Send a 'ready' message to the SW and wait back for a response
      // This way we ensure that Chelonia has been set up
      await waitUntilSwReady()

      if (!process.env.CI && typeof PeriodicSyncManager === 'function') {
        navigator.permissions.query({
          name: 'periodic-background-sync'
        }).then((status) => {
          if (status.state !== 'granted') {
            console.error('[service-workers/setup] Periodic sync event permission denied')
            return
          }

          return navigator.serviceWorker.ready.then((registration) =>
            registration.periodicSync.register('periodic-notifications', {
              // An interval of 12 hours
              minInterval: 12 * HOURS_MILLIS
            })
          )
        }).catch((e) => {
          console.error('[service-workers/setup] Error setting up periodic background sync events', e)
        })
      }

      // Set up an event listener to have SW call `skipWaiting` after
      // installation is complete. The SW already does this, but we had some
      // issues with the SW being installed but not activated after an update
      // for yet-unknown reasons. This logic attemps to force a new call to
      // `skipWaiting`, increasing the odds of the new SW replacing the old
      // version. (When a SW updates, both versions exist simultaneously,
      // although only one is connected to a page at a time.)
      swRegistration.addEventListener('updatefound', (e) => {
        const handler = (e) => {
          if (['activated', 'redundant'].includes(e.target.state)) {
            e.target.removeEventListener('statechange', handler)
            return
          }
          if (e.target.state === 'installed') {
            e.target.postMessage({ type: 'skip-waiting' })
          }
        }
        e.target.installing.addEventListener('statechange', handler, false)
      })

      // Keep the service worker alive while the window is open
      // The default idle timeout on Chrome and Firefox is 30 seconds. We send
      // a ping message every 5 seconds to ensure that the worker remains
      // active.
      // The downside of this is that there are messges going back and forth
      // between the service worker and each tab, the number of which is
      // proportional to the number of tabs open.
      // The upside of this is that the service worker remains active while
      // there are open tabs, which makes it faster and smoother to interact
      // with contracts than if the service worker had to be restarted.
      setInterval(() => navigator.serviceWorker.controller?.postMessage({ type: 'ping' }), 5000)
    } catch (e) {
      console.error('error setting up service worker:', e)
      throw e
    }
  },
  // We call this when the notification permission changes, to create a push
  // subscription and report it to the server. We need to do this outside of the
  // service worker because this generally happens after requesting the
  // notifications permission, which requires user interaction and can't be
  // done form the SW itself.
  // In theory, the `PushManager` APIs used are available in the SW and we could
  // have this function there. However, most examples perform this outside of the
  // SW, and private testing showed that it's more reliable doing it here.
  'service-worker/setup-push-subscription': async function (attemptNumber = 1) {
    if (process.env.CI) {
      throw new Error('Push disabled in CI mode')
    }
    let retryAttemptsPromise = null
    await sbp('okTurtles.eventQueue/queueEvent', 'service-worker/setup-push-subscription', async () => {
      const { notificationEnabled } = sbp('state/vuex/state').settings
      // Get the installed service-worker registration
      const registration = await navigator.serviceWorker.ready
      if (!registration) {
        throw new Error('No service-worker registration found!')
      }
      // Safari sometimes incorrectly reports 'prompt' when using `registration.pushManager.permissionState`
      const permissionState = await registration.pushManager.permissionState({ userVisibleOnly: true })
      const granted = permissionState === 'granted' || Notification.permission === 'granted'
      console.info(`[service-worker/setup-push-subscription] setup: notifications (${notificationEnabled}) perms (${granted})`)
      try {
        let subscription = null
        let subID = null
        // get a real push subscription only if both browser permissions allow and user wants us to
        if (notificationEnabled && granted) {
          subscription = await registration.pushManager.getSubscription()
          let newSub = false
          let endpoint = null
          if (!subscription || (subscription.expirationTime != null && subscription.expirationTime <= Date.now())) {
            const subscriptionOptions = await sbp('push/getSubscriptionOptions')
            subscription = await registration.pushManager.subscribe(subscriptionOptions)
            newSub = true
          }
          if (subscription?.endpoint) {
            endpoint = new URL(subscription.endpoint).host // hide the full endpoint from the logs for privacy
            subID = await getSubscriptionId(subscription.toJSON())
          }
          console.info(`[service-worker/setup-push-subscription] got ${newSub ? 'new' : 'existing'} subscription '${subID}':`, endpoint)
        }
        console.info('[service-worker/setup-push-subscription] calling push/reportExistingSubscription on:', subID)
        await sbp('push/reportExistingSubscription', subscription?.toJSON(), subscription?.options.applicationServerKey)
      } catch (e) {
        console.error('[service-worker/setup-push-subscription] error getting a subscription:', e)

        if (attemptNumber >= 12) {
          console.error('[service-worker/setup-push-subscription] maxAttempts reached, giving up')
          sbp('gi.ui/prompt', {
            heading: L('Error setting up push notifications'),
            question: L('Error setting up push notifications: {errMsg}{br_}{br_}Please make sure {a_}push services are enabled{_a} in your Browser settings, and then try reloading the app and toggling the push notifications toggle in the Notifications user settings.', {
              errMsg: e?.message,
              a_: '<a class="link" target="_blank" href="https://stackoverflow.com/a/69624651">',
              _a: '</a>',
              br_: '<br/>'
            }),
            primaryButton: L('Close')
          })
          // NOTE: we do not need to setup an ONLINE event listener here because one is already setup in main.js
          throw e // give up
        }
        // this outer promise is a way to wait on this sub-call to finish without getting the eventQueue stuck
        retryAttemptsPromise = new Promise((resolve, reject) => {
          // try again in 5 seconds
          setTimeout(() => {
            sbp('service-worker/setup-push-subscription', attemptNumber + 1).then(resolve).catch(reject)
          }, 5e3)
        })
      }
    })
    if (retryAttemptsPromise) {
      // wait until all attempts have finished
      await retryAttemptsPromise
    }
  },
  'service-worker/update': async function () {
    // This function manually checks for the service worker updates and trigger them if there are.
    // reference-1: https://web.dev/articles/service-worker-lifecycle#manual_updates
    // reference-2: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/update
    if ('serviceWorker' in navigator) {
      try {
        const swRegistration = await navigator.serviceWorker.ready

        if (swRegistration) {
          const newRegistration = await swRegistration.update()
          return newRegistration
        } else {
          console.debug('[sw] No active service-worker was found while checking for the updates.')
          return
        }
      } catch (err) {
        console.error(`[sw] Failed to update the service-worker! - ${err.message}`)
      }
    }
  },
  'service-worker/check-pwa-installability': function () {
    return Boolean(pwa.deferredInstallPrompt)
  },
  'service-worker/trigger-install-prompt': async function () {
    if (!pwa.deferredInstallPrompt) { return false }

    const result = await pwa.deferredInstallPrompt.prompt()
    return result.outcome
  }
})

// Events that need to be relayed to the SW
;[LOGIN_COMPLETE, SET_APP_LOGS_FILTER].forEach((event) =>
  sbp('okTurtles.events/on', event, (...data) => {
    navigator.serviceWorker.controller?.postMessage({ type: 'event', subtype: event, data })
  })
)

sbp('okTurtles.events/on', NEW_CHATROOM_UNREAD_POSITION, (obj: Object) => {
  // Don't send messages from the SW back to the SW to prevent infinite loops
  if (obj.from === 'sw') return
  navigator.serviceWorker.controller?.postMessage({ type: 'event', subtype: NEW_CHATROOM_UNREAD_POSITION, data: [obj] })
})

sbp('okTurtles.events/on', NEW_CHATROOM_NOTIFICATION_SETTINGS, (obj: Object) => {
  // Don't send messages from the SW back to the SW to prevent infinite loops
  if (obj.from === 'sw') return
  navigator.serviceWorker.controller?.postMessage({ type: 'event', subtype: NEW_CHATROOM_NOTIFICATION_SETTINGS, data: [obj] })
})

const swRpc = (() => {
  if (!navigator.serviceWorker) {
    throw new Error('Missing service worker object')
  }
  let controller: ?ServiceWorker = navigator.serviceWorker.controller
  navigator.serviceWorker.addEventListener('controllerchange', (ev: Event) => {
    controller = (navigator.serviceWorker: any).controller
  }, false)

  const fn = async (maxControllerChanges, ...args) => {
    if (!controller) {
      throw new Error('Service worker not ready')
    }
    await waitUntilSwReady()
    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel()
      const onmessage = (event: MessageEvent) => {
        if (event.data && Array.isArray(event.data)) {
          const r = deserializer(event.data[1])
          // $FlowFixMe[incompatible-use]
          if (event.data[0] === true) {
            resolve(r)
          } else {
            reject(r)
          }
          cleanup()
        }
      }
      const onmessageerror = (event: MessageEvent) => {
        reject(event.data)
        cleanup()
      }
      const oncontrollerchange = (event: Event) => {
        if (maxControllerChanges > 0) {
          resolve(fn(maxControllerChanges - 1, ...args))
        } else {
          reject(new Error('SW controller changed'))
        }
        cleanup()
      }
      const cleanup = () => {
        // This can help prevent memory leaks if the GC doesn't clean up once
        // the port goes out of scope
        messageChannel.port1.removeEventListener('message', onmessage, false)
        messageChannel.port1.removeEventListener('messageerror', onmessageerror, false)
        navigator.serviceWorker.removeEventListener('controllerchange', oncontrollerchange, false)
        messageChannel.port1.close()
      }
      messageChannel.port1.addEventListener('message', onmessage, false)
      messageChannel.port1.addEventListener('messageerror', onmessageerror, false)
      navigator.serviceWorker.addEventListener('controllerchange', oncontrollerchange, false)
      messageChannel.port1.start()
      const { data, transferables } = serializer(args)
      controller.postMessage({
        type: 'sbp',
        port: messageChannel.port2,
        data
      }, [messageChannel.port2, ...transferables])
    })
  }

  return (...args) => fn(3, ...args)
})()

sbp('sbp/selectors/register', {
  'gi.actions/*': swRpc,
  'chelonia/*': swRpc,
  'sw-namespace/*': (...args) => {
    // Remove the `sw-` prefix from the selector
    return swRpc(args[0].slice(3), ...args.slice(1))
  },
  'gi.notifications/*': swRpc,
  'sw/*': swRpc,
  'swLogs/*': swRpc,
  'push/*': swRpc
})
