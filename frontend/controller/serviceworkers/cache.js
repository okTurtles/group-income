const CACHE_VERSION = process.env.GI_VERSION
const CURRENT_CACHES = {
  assets: `assets-cache_v${CACHE_VERSION}`
}

if (
  typeof Cache === 'function' &&
  typeof CacheStorage === 'function' &&
  typeof caches === 'object' &&
  (caches instanceof CacheStorage)
) {
  const locationUrl = new URL(self.location)
  const routerBase = locationUrl.searchParams.get('routerBase') ?? '/app'

  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches
        .open(CURRENT_CACHES.assets)
        .then((cache) =>
          cache.addAll([
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

    try {
      const url = new URL(event.request.url)

      if (url.origin !== self.location.origin) {
        return
      }

      if (
        ['/eventsAfter/', '/name/', '/latestHEADinfo/', '/file/', '/kv/', '/zkpp/'].some(prefix => url.pathname.startsWith(prefix)) ||
        url.pathname === '/time'
      ) {
        return
      }

      // If the route starts with `${routerBase}/` or `/`, redirect to
      // `${routerBase}/`, since the HTML content is presumed to be the same.
      // This is _crucial_ for the offline PWA to work, since currently the app
      // uses different paths.
      if (
        url.pathname === '/' ||
        (url.pathname.startsWith(`${routerBase}/`) && url.pathname !== `${routerBase}/`)
      ) {
        event.respondWith(Response.redirect(`${routerBase}/`, 302))
        return
      }
    } catch (e) {
      return
    }

    event.respondWith(
      caches.open(CURRENT_CACHES.assets).then((cache) => {
        return cache
          .match(event.request, { ignoreSearch: true, ignoreVary: true })
          .then((cachedResponse) => {
            if (cachedResponse) {
              // If we're offline, return the cached response, if it exists
              if (navigator.onLine === false) {
                return cachedResponse
              }
            }

            // We use the original `event.request` for the network fetch
            // instead of the possibly re-written `request` (used as a cache
            // key) because the re-written request makes tests fail.
            return fetch(event.request).then(async (response) => {
              if (
                // Save successful reponses
                response.status >= 200 &&
                response.status < 400 &&
                response.status !== 206 && // Partial response
                response.status !== 304 && // Not modified
                // Which don't have a 'no-store' directive
                !response.headers.get('cache-control')?.split(',').some(x => x.trim() === 'no-store')
              ) {
                await cache.put(event.request, response.clone()).catch(e => {
                  console.error('Error adding request to cache')
                })
              } else if (response.status < 500) {
                // For 5xx responses (server errors, we don't delete the cache
                // entry. This is so that, in the event of a 5xx error,
                // the offline app still works.)
                await cache.delete(event.request)
              }

              return response
            }).catch(e => {
              if (cachedResponse) {
                console.warn('Error while fetching', event.request, e)
                // If there was a network error fetching, return the cached
                // response, if it exists
                return cachedResponse
              }

              throw e
            })
          })
      })
    )
  }, false)
}
