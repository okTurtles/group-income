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
            '/',
            '/assets/pwa-manifest.webmanifest',
            '/assets/images/group-income-icon-transparent.png',
            '/assets/images/pwa-icons/group-income-icon-maskable_192x192.png',
            '/assets/css/main.css',
            '/assets/js/main.js',
            `${routerBase}/`
          ]).catch(e => {
            console.error('Error adding initial entries to cache', e)
          })
        )
    )
  }, false)

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
  }, false)

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

      if (
        ['/eventsAfter/', '/name/', '/latestHEADinfo/', '/file/', '/kv/', '/zkpp/'].some(prefix => url.pathname.startsWith(prefix)) ||
        url.pathname === '/time'
      ) {
        return
      }

      // If the route starts with `${routerBase}/`, use `${routerBase}/` as the
      // URL, since the HTML content is presumed to be the same.
      if (url.pathname.startsWith(`${routerBase}/`)) {
        console.error('@@@@XX rewriting request', url.pathname, `${url.origin}${routerBase}/`)
        request = new Request(`${url.origin}${routerBase}/dashboard`)
      }
    } catch (e) {
      return
    }

    event.respondWith(
      caches.open(CURRENT_CACHES.assets).then((cache) => {
        return cache
          .match(request, { ignoreSearch: true, ignoreVary: true })
          .then((cachedResponse) => {
            if (request instanceof URL) {
              console.error('@@@@XX', 106, request)
            }
            if (cachedResponse) {
              // If we're offline, return the cached response, if it exists
              if (navigator.onLine === false) {
                if (request instanceof URL) {
                  console.error('@@@@XX', 112, request, navigator.onLine)
                }
                return cachedResponse
              }
            }

            return fetch(request.clone?.() || request).then(async (response) => {
              if (request instanceof URL) {
                console.error('@@@@XX', 120, request, response.status)
              }
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
              } else {
                await cache.delete(request)
              }

              if (request instanceof URL) {
                console.error('@@@@XX', 139, request, response.status)
              }

              return response
            }).catch(e => {
              if (request instanceof URL) {
                console.error('@@@@XX', 145, request, e)
              }

              if (cachedResponse) {
                console.warn('Error while fetching', request, e)
                // If there was a network error fetching, return the cached
                // response, if it exists
                if (request instanceof URL) {
                  console.error('@@@@XX', 153, request, e)
                }
                return cachedResponse
              }

              throw e
            })
          })
      })
    )
  }, false)
}
