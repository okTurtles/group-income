const hasFetch = typeof fetch === 'function' && typeof Request === 'function' && typeof Response === 'function'
const hasReadableStream = typeof ReadableStream === 'function'
const hasWebSocket = typeof WebSocket === 'function'
const hasReflect = typeof Reflect === 'object'
const hasNavigator = typeof Navigator === 'function' && typeof navigator === 'object' && navigator instanceof Navigator
const hasServiceWorker = hasNavigator && typeof ServiceWorkerContainer === 'function' && navigator.serviceWorker instanceof ServiceWorkerContainer
// $FlowFixMe[cannot-resolve-name]
const hasIndexedDB = typeof IDBFactory === 'function' && typeof indexedDB === 'object' && indexedDB instanceof IDBFactory
const hasSessionStorage = typeof Storage === 'function' && typeof sessionStorage === 'object' && sessionStorage instanceof Storage

console.info('Feature check', { hasFetch, hasReadableStream, hasWebSocket, hasReflect, hasNavigator, hasServiceWorker, hasIndexedDB, hasSessionStorage })

const hasAllRequiredFeatures: boolean = hasFetch && hasReadableStream && hasWebSocket && hasReflect && hasNavigator && hasServiceWorker && hasIndexedDB && hasSessionStorage

export default hasAllRequiredFeatures
