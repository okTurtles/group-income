const _instances: (() => Promise<*>)[] = []
// Localforage-like API for IndexedDB

const localforage = {
  async ready () {
    await Promise.all(_instances.map((lazyInitDb) => lazyInitDb()))
  },
  createInstance ({ name, storeName }: { name: string, storeName: string }) {
    // Open the IndexedDB database
    // We lazy load the IndexedDB, because before we were loading it when this
    // file was imported, but on iOS IndexedDB is not available in the service
    // worker when the PWA is in the background.
    // <https://bugs.webkit.org/show_bug.cgi?id=283793>
    // So for that reason, and potentially other situations where IndexedDB
    // might not be available, we lazy load it like this upon creation.
    const lazyInitDb = (() => {
      let promise
      return () => {
        if (!promise) {
          promise = new Promise((resolve, reject) => {
            if (name.includes('-') || storeName.includes('-')) {
              reject(new Error('Unsupported characters in name: -'))
              return
            }

            const openDB = (version?: number) => {
              // By default `version` is the latest DB version. Initially, we
              // try to open that, but in some cases (e.g., when manually
              // deleting the DBs), the schema will be wrong and miss the object
              // store. In these cases, we need to upgrade the DB by
              // incrementing the version number to re-create the schema, which
              // can only be done when the DB is being 'upgraded'.
              const request = self.indexedDB.open(name + '--' + storeName, version)

              // Create the object store if it doesn't exist
              request.onupgradeneeded = (event) => {
                const db = event.target.result
                db.createObjectStore(storeName)
              }

              request.onsuccess = (event) => {
                const db = event.target.result
                if (!db.objectStoreNames.contains(storeName)) {
                  return openDB(db.version + 1)
                }

                resolve(db)
              }

              request.onerror = (error) => {
                reject(error)
              }

              // If this happens, closing all tabs and stopping the SW could
              // help.
              request.onblocked = (event) => {
                reject(new Error('DB is blocked'))
              }
            }

            openDB()
          })
        }
        return promise
      }
    })()

    _instances.push(lazyInitDb)

    return {
      async clear () {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.clear()
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e)
          }
        })
      },
      async getItem (key: string) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readonly')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.get(key)
        return new Promise((resolve, reject) => {
          request.onsuccess = (event) => {
            resolve(event.target.result)
          }
          request.onerror = (e) => {
            reject(e)
          }
        })
      },
      async removeItem (key: string) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.delete(key)
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e.target.error)
          }
        })
      },
      async removeMany (keys: string[]) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)

        for (const key of keys) {
          objectStore.delete(key)
        }

        return new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve()
          transaction.onerror = (e) => reject(e.target.error)
          transaction.onabort = (e) => reject(e.target.error)
        })
      },
      async setItem (key: string, value: any) {
        const db = await lazyInitDb()
        const transaction = db.transaction([storeName], 'readwrite')
        const objectStore = transaction.objectStore(storeName)
        const request = objectStore.put(value, key)
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            resolve()
          }
          request.onerror = (e) => {
            reject(e.target.error)
          }
        })
      }
    }
  }
}

export default (localforage: any)
