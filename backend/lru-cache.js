// How many entries to keep at most.
const MAX_CACHE_ENTRIES = 1000

module.exports = function createCache (): Object {
  const map = new Map()

  return {
    get (key: any): any {
      return map.get(key)
    },
    has (key: any): boolean {
      return map.has(key)
    },
    set (key: any, value: any): void {
      map.set(key, value)
      // Remove the oldest cache entry if necessary.
      if (map.size > MAX_CACHE_ENTRIES) {
        // Modern .keys() implementations return an iterator which respects key insertion order.
        // This means the first iterated key will be the oldest one to have been added.
        map.delete(map.keys().next().value)
      }
    }
  }
}
