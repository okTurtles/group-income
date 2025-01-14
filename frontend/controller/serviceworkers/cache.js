import sbp from '@sbp/sbp'
import { NOTIFICATION_TYPE } from '~/shared/pubsub.js'

const CACHE_VERSION = '1.0.0'
const CURRENT_CACHES = {
  assets: `assets-cache_v${CACHE_VERSION}`
}

if (
  typeof Cache === 'function' &&
  typeof CacheStorage === 'function' &&
  typeof caches === 'object' &&
  (caches instanceof CacheStorage)
) {
  sbp('okTurtles.events/on', NOTIFICATION_TYPE.VERSION_INFO, (data) => {
    if (data.GI_VERSION !== process.env.GI_VERSION) {
      caches.delete(CURRENT_CACHES.assets).catch(e => {
        console.error('Error trying to delete cache', CURRENT_CACHES.assets)
      })
    }
  })

  const locationUrl = new URL(self.location)
  const routerBase = locationUrl.searchParams.get('routerBase') ?? '/app'

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(CURRENT_CACHES.assets)
        .then((cache) =>
          cache.addAll([
            `${routerBase}/`
          ]).catch(e => {
            console.error('Error adding initial entries to cache')
          })
        )
    )
  })

  // Taken from the MDN example:
  // <https://developer.mozilla.org/en-US/docs/Web/API/Cache>
  self.addEventListener('activate', (event) => {
    const expectedCacheNamesSet = new Set(Object.values(CURRENT_CACHES))

    event.waitUntil(
      caches.keys().then((cacheNames) =>
        Promise.allSettled(
          cacheNames.map((cacheName) => {
            if (!expectedCacheNamesSet.has(cacheName)) {
              // If this cache name isn't present in the set of
              // "expected" cache names, then delete it.
              console.log('Deleting out of date cache:', cacheName)
              return caches.delete(cacheName)
            }

            return undefined
          })
        )
      )
    )
  })

  self.addEventListener('fetch', function (event) {
    console.debug(`[sw] fetch : ${event.request.method} - ${event.request.url}`)

    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
      return
    }

    let request = event.request

    try {
      const url = new URL(request.url)
      if (url.pathname.startsWith('/file')) {
        return
      }

      // If the route starts with `${routerBase}/`, use `${routerBase}/` as the
      // URL, since the HTML content is presumed to be the same.
      if (url.pathname.startsWith(`${routerBase}/`)) {
        request = new Request(`${routerBase}/`, request)
      }
    } catch (e) {
      return
    }

    event.respondWith(
      caches.open(CURRENT_CACHES.assets).then((cache) => {
        return cache
          .match(request)
          .then((response) => {
            if (response) {
              if (navigator.onLine === false) {
                return response
              }
            }

            return fetch(request.clone()).then(async (response) => {
              if (
                // Save successful reponses
                response.status >= 200 &&
                response.status < 400 &&
                response.status !== 206 && // Partial response
                response.status !== 304 && // Not modified
                // Which don't have a 'no-store' directive
                !response.headers.get('cache-control')?.split(',').some(x => x.trim() === 'no-store')
              ) {
                await cache.put(request, response.clone()).catch(e => {
                  console.error('Error adding request to cache')
                })
              }

              return response
            })
          })
      })
    )
  })
}
