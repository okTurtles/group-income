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
sbp('sbp/selectors/register', {
  'backend/db/streamEntriesAfter': async function (contractID: string, height: string, requestedLimit: ?number): Promise<*> {
    const limit = Math.min(requestedLimit ?? Number.POSITIVE_INFINITY, process.env.MAX_EVENTS_BATCH_SIZE ?? 500)
    const latestHEADinfo = await sbp('chelonia/db/latestHEADinfo', contractID)
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
})

function namespaceKey (name: string): string {
  return 'name=' + name
}

export default async () => {
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
        if (process.env.CHELONIA_ARCHIVE_MODE) throw new Error('Unable to write in archive mode')
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
        if (process.env.CHELONIA_ARCHIVE_MODE) throw new Error('Unable to write in archive mode')
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
