const CACHE_VERSION = process.env.GI_VERSION
const CURRENT_CACHES = {
  assets: `assets-cache_v${CACHE_VERSION}`,
  contracts: `contracts-cache_v${CACHE_VERSION}`
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

  // eslint-disable-next-line require-await
  const cachedFetch = async (request) => {
    console.debug(`[sw] fetch : ${request.method} - ${request.url}`)

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return
    }
    let targetCache = CURRENT_CACHES.assets

    let cacheLookupKey = request
    try {
      const url = new URL(request.url)

      if (url.origin !== self.location.origin) {
        return
      }

      if (
        ['/__/', '/eventsAfter/', '/name/', '/latestHEADinfo/', '/kv/', '/zkpp/'].some(prefix => url.pathname.startsWith(prefix)) ||
        url.pathname === '/time'
      ) {
        return
      }

      if (url.pathname.startsWith('/file/')) {
        if (
          !url.pathname.startsWith('/file/zL7mM9d4Xb4T') &&
          !url.pathname.startsWith('/file/zLAeVmpcc88g')
        ) {
          return
        }
        targetCache = CURRENT_CACHES.contracts
      }

      // If the route starts with `${routerBase}/` or `/`, redirect to
      // `${routerBase}/`, since the HTML content is presumed to be the same.
      // This is _crucial_ for the offline PWA to work, since currently the app
      // uses different paths.
      if (
        url.pathname === '/' ||
        (url.pathname.startsWith(`${routerBase}/`) && url.pathname !== `${routerBase}/`)
      ) {
        // TODO: Tests still broken (/join on group-member-removal)
        cacheLookupKey = new Request(`${routerBase}/`)
        // return Response.redirect(`${routerBase}/`, 302)
      }
    } catch (e) {
      return
    }

    return (
      caches.match(cacheLookupKey, { ignoreSearch: true, ignoreVary: true })
        .then((cachedResponse) => {
          // If a cached response exists, return it. Not only does this
          // improve performance, but it also makes the app work 'offline'
          // (`navigator.onLine` is unreliable; can be `true` even when
          // offline). The downside of this approach is that we may return
          // stale assets when the app is updated. Fortunately, so long as the
          // version is updated (GI_VERSION), existing cache entries will be
          // deleted. This will happen with SW updates, so, ideally, we won't
          // serve stale resources for too long.
          if (cachedResponse) {
            return cachedResponse
          }

          // We use the original `request` for the network fetch
          // instead of the possibly re-written `request` (used as a cache
          // key) because the re-written request makes tests fail.
          return caches.open(targetCache).then((cache) => {
            return fetch(request).then(async (response) => {
              if (
              // Save successful reponses
                response.status >= 200 &&
                response.status < 400 &&
                response.status !== 206 && // Partial response
                response.status !== 304 && // Not modified
                // Which don't have a 'no-store' directive
                !response.headers.get('cache-control')?.split(',').some(x => x.trim() === 'no-store')
              ) {
                await cache.put(cacheLookupKey, response.clone()).catch(e => {
                  console.error('Error adding request to cache')
                })
              } else if (response.status < 500) {
                // For 5xx responses (server errors, we don't delete the cache
                // entry. This is so that, in the event of a 5xx error,
                // the offline app still works.)
                await cache.delete(cacheLookupKey)
              }

              return response
            })
          })
        })
    )
  }

  self.addEventListener('fetch', function (event) {
    event.respondWith(cachedFetch(event.request).then((r) => {
      return r || fetch(event.request)
    }))
  }, false)

  Object.defineProperty(self, 'cachedFetch', { value: cachedFetch })
}
