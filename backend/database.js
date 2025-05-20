'use strict'

import sbp from '@sbp/sbp'
import { maybeParseCID, multicodes, strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import '@sbp/okturtles.data'
import { checkKey, parsePrefixableKey, prefixHandlers } from '~/shared/domains/chelonia/db.js'
import LRU from 'lru-cache'
import { initVapid } from './vapid.js'
import { initZkpp } from './zkppSalt.js'

const Boom = require('@hapi/boom')

const production = process.env.NODE_ENV === 'production'
// Defaults to `fs` in production.
const persistence = process.env.GI_PERSIST || (production ? 'fs' : undefined)

// Default database options. Other values may be used e.g. in tests.
const dbRootPath = process.env.DB_PATH || './data'
const options = {
  fs: {
    depth: 0,
    dirname: dbRootPath,
    keyChunkLength: 2
  },
  sqlite: {
    filepath: path.join(dbRootPath, 'groupincome.db')
  }
}

// Segment length for keyop index. Changing this value will require rebuilding
// this index. The value should be a power of 10 (e.g., 10, 100, 1000, 10000)
export const KEYOP_SEGMENT_LENGTH = 10_000

// Used by `throwIfFileOutsideDataDir()`.
const dataFolder = path.resolve(options.fs.dirname)

// Create our data folder if it doesn't exist yet.
// This is currently necessary even when not using persistence, e.g. to store file uploads.
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

export const updateSize = async (resourceID: string, sizeKey: string, size: number) => {
  if (!Number.isSafeInteger(size)) {
    throw new TypeError(`Invalid given size ${size} for ${resourceID}`)
  }
  // Use a queue to ensure atomic updates
  await sbp('okTurtles.eventQueue/queueEvent', sizeKey, async () => {
    // Size is stored as a decimal value
    const existingSize = parseInt(await sbp('chelonia.db/get', sizeKey, { bypassCache: true }) ?? '0', 10)
    if (!(existingSize >= 0)) {
      throw new TypeError(`Invalid stored size ${existingSize} for ${resourceID}`)
    }
    const updatedSize = existingSize + size
    if (!(updatedSize >= 0)) {
      throw new TypeError(`Invalid stored updated size ${updatedSize} for ${resourceID}`)
    }
    await sbp('chelonia.db/set', sizeKey, updatedSize.toString(10))
  })
}

// Streams stored contract log entries since the given entry hash (inclusive!).
export default ((sbp('sbp/selectors/register', {
  'backend/db/streamEntriesAfter': async function (contractID: string, height: number, requestedLimit: ?number, options: { keyOps?: boolean } = {}): Promise<*> {
    const limit = Math.min(requestedLimit ?? Number.POSITIVE_INFINITY, process.env.MAX_EVENTS_BATCH_SIZE ?? 500)
    const latestHEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
    if (latestHEADinfo === '') {
      throw Boom.resourceGone(`contractID ${contractID} has been deleted!`)
    }
    if (!latestHEADinfo) {
      throw Boom.notFound(`contractID ${contractID} doesn't exist!`)
    }
    // Number of entries pushed.
    let counter = 0
    let currentHeight = height
    let currentHash, serverMeta
    let prefix = ''
    // `nextKeyOp` is used to advance `currentHeight` when fetching keyOps, and
    // more complex behaviour than simple 'increment by 1' is needed.
    // It returns three possible values: `true`, indicating `currentHeight` has
    // been set to the next `currentHeight`; `false`, indicating the end of
    // the stream; and `null`, indicating the result is indeterminate and
    // `nextKeyOp` should be called again (this is because key ops are indexed
    // based on their height in segments of 10k height entries).
    // `nextKeyOp` will do the following: if `currentHeight` points to a key op,
    // it will leave `currentHeight` unchanged; otherwise, if `currentHeight`
    // does _not_ point to a key op, `currentHeight` will be set to the smallest
    // height larger than the current `currentHeight` value which is a key op.
    const nextKeyOp = (() => {
      let index: ?string[]

      return async () => {
        if (!index) {
          index = (await sbp('chelonia.db/get', `_private_keyop_idx_${contractID}_${currentHeight - currentHeight % KEYOP_SEGMENT_LENGTH}`))?.split('\x00')
        }
        const value = index?.find((h, i) => {
          if (Number(h) >= currentHeight) {
            // Remove values that no longer are relevant from the index
            index = ((index: any): string[]).slice(i + 1)
            return true
          } else {
            return false
          }
        })
        if (value != null) {
          const newHeight = Number(value)
          currentHeight = newHeight
        } else {
          // We've exhausted the current index; we'll return `null` and advance
          // height by KEYOP_SEGMENT_LENGTH so that we can read the next index
          // upon the next invocation (or, if we've reached the end of the
          // contract, we return `false`).
          currentHeight = currentHeight - currentHeight % KEYOP_SEGMENT_LENGTH + KEYOP_SEGMENT_LENGTH
          index = undefined
          if (currentHeight > latestHEADinfo.height) {
            return false
          } else {
            return null
          }
        }
        return true
      }
    })()
    // `fetchMeta` fetches metadata information for entries based on height.
    // Crucially, it fetches the entry hash (i.e., height -> hash lookup), which
    // is needed for returning the correct data.
    // The return value isn't currently used but is left as it may be useful in
    // the future if this code is refactored. `false` indicates that no metadata
    // could be found (indicating the end of a contract --or some kind of data
    // corruption) and that the stream has ended. `true` indicates that the
    // function executed successfully and the stream continues.
    // Currently, the return value is not used because we're relying on the
    // truthiness of `serverMeta` as a subtitute.
    const fetchMeta = async () => {
      if (currentHeight > latestHEADinfo.height) {
        return false
      }
      const meta = await sbp('chelonia/db/getEntryMeta', contractID, currentHeight)
      if (!meta) {
        return false
      }

      const { hash: newCurrentHash, ...newServerMeta } = meta
      currentHash = newCurrentHash
      serverMeta = newServerMeta

      return true
    }
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    const stream = Readable.from((async function * () {
      yield '['
      await fetchMeta()
      while (serverMeta && counter < limit) {
        try {
          const entry = await sbp('chelonia/db/getEntry', currentHash)
          // If the entry doesn't exist, we may have reached the end
          if (!entry) break
          const currentPrefix = prefix
          prefix = ','
          counter++
          yield `${currentPrefix}"${strToB64(
            JSON.stringify({ serverMeta, message: entry.serialize() })
          )}"`
          // Note for future improvement: implement a generator function for
          // advancing height, which would make this logic more general by
          // having just something like `await height.next()` instead of this
          // avancement here and separate logic for each special case (like the
          // `if` below for key ops).
          currentHeight++
          currentHash = undefined
          serverMeta = undefined
          // queries with 'keyOps' always return the requested height, whether
          // or not a keyOp.
          if (options.keyOps) {
            // Advance `currentHeight` until the next key op
            // `nextKeyOp` relies on the height advancing after an ideration and
            // the previous currentHeight++ will not result in incorrect
            // behaviour.
            while ((await nextKeyOp()) === null);
          }
          await fetchMeta()
        } catch (e) {
          console.error(`[backend] streamEntriesAfter: read(): ${e.message}:`, e.stack)
          break
        }
      }
      yield ']'
    })(), { encoding: 'UTF-8', objectMode: false })

    // $FlowFixMe[prop-missing]
    stream.headers = {
      'shelter-headinfo-head': latestHEADinfo.HEAD,
      'shelter-headinfo-height': latestHEADinfo.height
    }
    return stream
  },
  // =======================
  // wrapper methods to add / lookup names
  // =======================
  'backend/db/registerName': async function (name: string, value: string): Promise<*> {
    const exists = await sbp('backend/db/lookupName', name)
    if (exists) {
      throw Boom.conflict('exists')
    }
    await sbp('chelonia.db/set', namespaceKey(name), value)
    await sbp('chelonia.db/set', `_private_cid2name_${value}`, name)
    await appendToNamesIndex(name)

    return { name, value }
  },
  'backend/db/lookupName': async function (name: string): Promise<string> {
    const value = await sbp('chelonia.db/get', namespaceKey(name))
    return value
  }
}): any): string[])

function namespaceKey (name: string): string {
  return 'name=' + name
}

export const initDB = async ({ skipDbPreloading }: { skipDbPreloading?: boolean } = {}) => {
  // If persistence must be enabled:
  // - load and initialize the selected storage backend
  // - then overwrite 'chelonia.db/get' and '-set' to use it with an LRU cache
  if (persistence) {
    const Ctor = (await import(`./database-${persistence}.js`)).default
    // Destructuring is safe because these methods have been bound using rebindMethods().
    const { init, readData, writeData, deleteData } = new Ctor(options[persistence])
    await init()

    // https://github.com/isaacs/node-lru-cache#usage
    const cache = new LRU({
      max: Number(process.env.GI_LRU_NUM_ITEMS) || 10000
    })

    const prefixes = Object.keys(prefixHandlers)
    sbp('sbp/selectors/overwrite', {
      'chelonia.db/get': async function (prefixableKey: string, { bypassCache }: { bypassCache?: boolean } = {}): Promise<Buffer | string | void> {
        if (!bypassCache) {
          const lookupValue = cache.get(prefixableKey)
          if (lookupValue !== undefined) {
            return lookupValue
          }
        }
        const [prefix, key] = parsePrefixableKey(prefixableKey)
        let value = await readData(key)
        if (value === undefined) {
          return
        }
        value = prefixHandlers[prefix](value)
        cache.set(prefixableKey, value)
        return value
      },
      'chelonia.db/set': async function (key: string, value: Buffer | string): Promise<void> {
        if (process.env.CHELONIA_ARCHIVE_MODE) throw new Error('Unable to write in archive mode')
        checkKey(key)
        if (key.startsWith('_private_immutable')) {
          const existingValue = await readData(key)
          if (existingValue !== undefined) {
            throw new Error('Cannot set already set immutable key')
          }
        }
        await writeData(key, value)
        // `get` uses `prefixableKey` as key, which now that the value is updated
        // is stale. We delete all prefixed key variants from the cache to
        // avoid serving stale data. Note that because of prefixes, `cache.set`
        // can't be (easily) used to set the key, as transformations could happen
        // on the unprefixed version.
        // Note: 2025-03-24: We benchmarked `.forEach`, `for of` and `for`.
        // Which one was faster depended on the browser, with no clear overall
        // winner, but `.forEach` was faster on Chrome, which uses the same
        // engine as Node.JS (V8).
        prefixes.forEach(prefix => {
          cache.delete(prefix + key)
        })
      },
      'chelonia.db/delete': async function (key: string): Promise<void> {
        if (process.env.CHELONIA_ARCHIVE_MODE) throw new Error('Unable to write in archive mode')
        checkKey(key)
        if (key.startsWith('_private_immutable')) {
          throw new Error('Cannot delete immutable key')
        }
        await deleteData(key)
        // `get` uses `prefixableKey` as key, which now that the value is updated
        // is stale. We delete all prefixed key variants from the cache to
        // avoid serving stale data.
        prefixes.forEach(prefix => {
          cache.delete(prefix + key)
        })
      }
    })
    sbp('sbp/selectors/lock', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete'])
  }
  if (skipDbPreloading) return
  // TODO: Update this to only run when persistence is disabled when `chel deploy` can target SQLite.
  if (persistence !== 'fs' || options.fs.dirname !== dbRootPath) {
    // Remember to keep these values up-to-date.
    const HASH_LENGTH = 56

    // Preload contract source files and contract manifests into Chelonia DB.
    // Note: the data folder may contain other files if the `fs` persistence mode
    // has been used before. We won't load them here; that's the job of `chel migrate`.
    // Note: our target files are currently deployed with unprefixed hashes as file names.
    // We can take advantage of this to recognize them more easily.
    // TODO: Update this code when `chel deploy` no longer generates unprefixed keys.
    const keys = (await readdir(dataFolder))
      // Skip some irrelevant files.
      .filter(k => {
        if (k.length !== HASH_LENGTH) return false
        const parsed = maybeParseCID(k)
        return ([
          multicodes.SHELTER_CONTRACT_MANIFEST,
          multicodes.SHELTER_CONTRACT_TEXT].includes(parsed?.code)
        )
      })
    const numKeys = keys.length
    let numVisitedKeys = 0
    let numNewKeys = 0
    const savedProgress = { value: 0, numKeys: 0 }

    console.info('[chelonia.db] Preloading...')
    for (const key of keys) {
      // Skip keys which are already in the DB.
      if (!persistence || !await sbp('chelonia.db/get', key)) {
        // Load only contract source files and contract manifests.
        const value = await readFile(path.join(dataFolder, key), 'utf8')
        await sbp('chelonia.db/set', key, value)
        numNewKeys++
      }
      numVisitedKeys++
      const progress = numVisitedKeys === numKeys ? 100 : Math.floor(100 * numVisitedKeys / numKeys)
      // Display progress lines between at least 10% increments, and no more than every 10 visited keys.
      if (progress === 100 || (progress - savedProgress.value >= 10 && numVisitedKeys - savedProgress.numKeys >= 10)) {
        console.info(`[chelonia.db] Preloading... ${progress}% done`)
        savedProgress.numKeys = numVisitedKeys
        savedProgress.value = progress
      }
    }
    numNewKeys && console.info(`[chelonia.db] Preloaded ${numNewKeys} new entries`)
  }
  await Promise.all([initVapid(), initZkpp()])
}

// Index management

/**
 * Creates a factory function that appends a value to a string index in a
 * database.
 * The index is identified by the provided key. The value is appended only if it
 * does not already exist in the index.
 *
 * @param key - The key that identifies the index in the database.
 * @returns A function that takes a value to append to the index.
 */
export const appendToIndexFactory = (key: string): (value: string) => Promise<void> => {
  return (value: string) => {
    // We want to ensure that the index is updated atomically (i.e., if there
    // are multiple additions, all of them should be handled), so a queue
    // is needed for the load & store operation.
    return sbp('okTurtles.eventQueue/queueEvent', key, async () => {
      // Retrieve the current index from the database using the provided key
      const currentIndex = await sbp('chelonia.db/get', key, { bypassCache: true })

      // If the current index exists, check if the value is already present
      if (currentIndex) {
        // Check for existing value to avoid duplicates
        if (
          // Check if the value is at the end
          currentIndex.endsWith('\x00' + value) ||
          // Check if the value is at the start
          currentIndex.startsWith(value + '\x00') ||
          // Check if the current index is exactly the value
          currentIndex === value
        ) {
          // Exit if the value already exists
          return
        }

        // Append the new value to the current index, separated by NUL
        await sbp('chelonia.db/set', key, `${currentIndex}\x00${value}`)
        return
      }

      // If the current index does not exist, set it to the new value
      await sbp('chelonia.db/set', key, value)
    })
  }
}

const appendToNamesIndex = appendToIndexFactory('_private_names_index')

/**
 * Creates a factory function that removes a value from a string index in a
 * database.
 * The index is identified by the provided key. The function handles various
 * cases to ensure the value is correctly removed from the index.
 *
 * @param key - The key that identifies the index in the database.
 * @returns A function that takes a value to remove from the index.
 */
export const removeFromIndexFactory = (key: string): (values: string | string[]) => Promise<void> => {
  return (values: string | string[]) => {
    return sbp('okTurtles.eventQueue/queueEvent', key, async () => {
      // Retrieve the existing entries from the database using the provided key
      let existingEntries = await sbp('chelonia.db/get', key, { bypassCache: true })
      // Exit if there are no existing entries
      if (!existingEntries) return

      if (!Array.isArray(values)) {
        values = [values]
      }

      for (const value of values) {
        // Handle the case where the value is at the end of the entries
        // $FlowFixMe[incompatible-use]
        if (existingEntries.endsWith('\x00' + value)) {
          // $FlowFixMe[incompatible-use]
          existingEntries = existingEntries.slice(0, -value.length - 1)
          continue
        }

        // Handle the case where the value is at the start of the entries
        // $FlowFixMe[incompatible-use]
        if (existingEntries.startsWith(value + '\x00')) {
          // $FlowFixMe[incompatible-use]
          existingEntries = existingEntries.slice(value.length + 1)
          continue
        }

        // Handle the case where the existing entries are exactly the value
        if (existingEntries === value) {
          // There's nothing left after removing `value` from `existingEntries`
          // when `existingEntries` is equal to `value`, so set
          // `existingEntries` to undefined and end the loop.
          existingEntries = undefined
          break
        }

        // Find the index of the value in the existing entries
        // $FlowFixMe[incompatible-use]
        const entryIndex = existingEntries.indexOf('\x00' + value + '\x00')
        if (entryIndex === -1) continue

        // Create an updated index by removing the value
        // $FlowFixMe[incompatible-use]
        existingEntries = existingEntries.slice(0, entryIndex) + existingEntries.slice(entryIndex + value.length + 1)
      }
      // Update the index in the database or delete it if empty
      if (existingEntries) {
        await sbp('chelonia.db/set', key, existingEntries)
      } else {
        await sbp('chelonia.db/delete', key)
      }
    })
  }
}

export const lookupUltimateOwner = async (resourceID: string): Promise<string> => {
  let ownerID = resourceID
  for (let depth = 128; depth >= 0; depth--) {
    // Fetch the immediate owner.
    const newOwnerID = await sbp('chelonia.db/get', `_private_owner_${ownerID}`, { bypassCache: true })
    // Found the ultimate owner
    if (!newOwnerID) break
    if (!depth) {
      throw new Error('Exceeded max depth looking up owner for ' + resourceID)
    }
    ownerID = newOwnerID
  }
  return ownerID
}
