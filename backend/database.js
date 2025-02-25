'use strict'

import sbp from '@sbp/sbp'
import { strToB64 } from '~/shared/functions.js'
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
    dirname: dbRootPath
  },
  sqlite: {
    dirname: dbRootPath,
    filename: 'groupincome.db'
  }
}

// Used by `throwIfFileOutsideDataDir()`.
const dataFolder = path.resolve(options.fs.dirname)

// Create our data folder if it doesn't exist yet.
// This is currently necessary even when not using persistence, e.g. to store file uploads.
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

// Streams stored contract log entries since the given entry hash (inclusive!).
export default ((sbp('sbp/selectors/register', {
  'backend/db/streamEntriesAfter': async function (contractID: string, height: string, requestedLimit: ?number): Promise<*> {
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
    let currentHash = await sbp('chelonia.db/get', `_private_hidx=${contractID}#${height}`)
    let prefix = '['
    let ended = false
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    const stream = new Readable({
      read (): void {
        if (ended) {
          this.destroy()
          return
        }
        if (currentHash && counter < limit) {
          sbp('chelonia/db/getEntry', currentHash).then(async entry => {
            if (entry) {
              const currentPrefix = prefix
              prefix = ','
              counter++
              currentHash = await sbp('chelonia.db/get', `_private_hidx=${contractID}#${entry.height() + 1}`)
              this.push(`${currentPrefix}"${strToB64(entry.serialize())}"`)
            } else {
              this.push(counter > 0 ? ']' : '[]')
              this.push(null)
              ended = true
            }
          }).catch(e => {
            console.error(`[backend] streamEntriesAfter: read(): ${e.message}:`, e)
            this.push(counter > 0 ? ']' : '[]')
            this.push(null)
            ended = true
          })
        } else {
          this.push(counter > 0 ? ']' : '[]')
          this.push(null)
          ended = true
        }
      }
    })
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
      if (!Boom.isBoom(exists)) {
        return Boom.conflict('exists')
      } else if (exists.output.statusCode !== 404) {
        throw exists // throw if this is an error other than "not found"
      }
      // otherwise it is a Boom.notFound(), proceed ahead
    }
    await sbp('chelonia.db/set', namespaceKey(name), value)
    return { name, value }
  },
  'backend/db/lookupName': async function (name: string): Promise<string | Error> {
    const value = await sbp('chelonia.db/get', namespaceKey(name))
    return value || Boom.notFound()
  }
}): any): string[])

function namespaceKey (name: string): string {
  return 'name=' + name
}

export const initDB = async () => {
  // If persistence must be enabled:
  // - load and initialize the selected storage backend
  // - then overwrite 'chelonia.db/get' and '-set' to use it with an LRU cache
  if (persistence) {
    const { initStorage, readData, writeData, deleteData } = await import(`./database-${persistence}.js`)

    await initStorage(options[persistence])

    // https://github.com/isaacs/node-lru-cache#usage
    const cache = new LRU({
      max: Number(process.env.GI_LRU_NUM_ITEMS) || 10000
    })

    sbp('sbp/selectors/overwrite', {
      'chelonia.db/get': async function (prefixableKey: string): Promise<Buffer | string | void> {
        const lookupValue = cache.get(prefixableKey)
        if (lookupValue !== undefined) {
          return lookupValue
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
        checkKey(key)
        if (key.startsWith('_private_immutable')) {
          const existingValue = await readData(key)
          if (existingValue !== undefined) {
            throw new Error('Cannot set already set immutable key')
          }
        }
        await writeData(key, value)
        cache.set(key, value)
      },
      'chelonia.db/delete': async function (key: string): Promise<void> {
        checkKey(key)
        if (key.startsWith('_private_immutable')) {
          throw new Error('Cannot delete immutable key')
        }
        await deleteData(key)
        cache.delete(key)
      }
    })
    sbp('sbp/selectors/lock', ['chelonia.db/get', 'chelonia.db/set', 'chelonia.db/delete'])
  }
  // TODO: Update this to only run when persistence is disabled when `chel deploy` can target SQLite.
  if (persistence !== 'fs' || options.fs.dirname !== dbRootPath) {
    // Remember to keep these values up-to-date.
    const HASH_LENGTH = 52
    const CONTRACT_MANIFEST_MAGIC = '{"head":"{\\"manifestVersion\\"'
    const CONTRACT_SOURCE_MAGIC = '"use strict";'
    // Preload contract source files and contract manifests into Chelonia DB.
    // Note: the data folder may contain other files if the `fs` persistence mode
    // has been used before. We won't load them here; that's the job of `chel migrate`.
    // Note: our target files are currently deployed with unprefixed hashes as file names.
    // We can take advantage of this to recognize them more easily.
    // TODO: Update this code when `chel deploy` no longer generates unprefixed keys.
    const keys = (await readdir(dataFolder))
      // Skip some irrelevant files.
      .filter(k => k.length === HASH_LENGTH)
    const numKeys = keys.length
    let numVisitedKeys = 0
    let numNewKeys = 0
    const savedProgress = { value: 0, numKeys: 0 }

    console.info('[chelonia.db] Preloading...')
    for (const key of keys) {
      // Skip keys which are already in the DB.
      if (!persistence || !await sbp('chelonia.db/get', key)) {
        const value = await readFile(path.join(dataFolder, key), 'utf8')
        // Load only contract source files and contract manifests.
        if (value.startsWith(CONTRACT_MANIFEST_MAGIC) || value.startsWith(CONTRACT_SOURCE_MAGIC)) {
          await sbp('chelonia.db/set', key, value)
          numNewKeys++
        }
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
      const currentIndex = await sbp('chelonia.db/get', key)

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

/**
 * Creates a factory function that removes a value from a string index in a
 * database.
 * The index is identified by the provided key. The function handles various
 * cases to ensure the value is correctly removed from the index.
 *
 * @param key - The key that identifies the index in the database.
 * @returns A function that takes a value to remove from the index.
 */
export const removeFromIndexFactory = (key: string): (value: string) => Promise<void> => {
  return (value: string) => {
    return sbp('okTurtles.eventQueue/queueEvent', key, async () => {
      // Retrieve the existing entries from the database using the provided key
      const existingEntries = await sbp('chelonia.db/get', key)
      // Exit if there are no existing entries
      if (!existingEntries) return

      // Handle the case where the value is at the end of the entries
      if (existingEntries.endsWith('\x00' + value)) {
        await sbp('chelonia.db/set', key, existingEntries.slice(0, -value.length - 1))
        return
      }

      // Handle the case where the value is at the start of the entries
      if (existingEntries.startsWith(value + '\x00')) {
        await sbp('chelonia.db/set', key, existingEntries.slice(value.length + 1))
        return
      }

      // Handle the case where the existing entries are exactly the value
      if (existingEntries === value) {
        await sbp('chelonia/db/delete', key)
        return
      }

      // Find the index of the value in the existing entries
      const entryIndex = existingEntries.indexOf('\x00' + value + '\x00')
      if (entryIndex === -1) return

      // Create an updated index by removing the value
      const updatedIndex = existingEntries.slice(0, entryIndex) + existingEntries.slice(entryIndex + value.length + 1)

      // Update the index in the database or delete it if empty
      if (updatedIndex) {
        await sbp('chelonia.db/set', key, updatedIndex)
      } else {
        await sbp('chelonia/db/delete', key)
      }
    })
  }
}
