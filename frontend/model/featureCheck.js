const requiredFeatures = {
  fetch: typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function',
  streams: typeof ReadableStream === 'function',
  webSocket: typeof WebSocket === 'function',
  reflect: typeof Reflect === 'object',
  serviceWorker: typeof Navigator === 'function' && typeof navigator === 'object' && navigator instanceof Navigator && typeof navigator === 'object' && typeof ServiceWorkerContainer === 'function' && navigator.serviceWorker instanceof ServiceWorkerContainer,
  // $FlowFixMe[cannot-resolve-name]
  indexedDB: typeof IDBFactory === 'function' && typeof indexedDB === 'object' && indexedDB instanceof IDBFactory,
  sessionStorage: typeof Storage === 'function' && typeof sessionStorage === 'object' && sessionStorage instanceof Storage
}

console.info('Feature check', requiredFeatures)

const hasAllRequiredFeatures: boolean = Object.values(requiredFeatures).every(Boolean)

export default hasAllRequiredFeatures
