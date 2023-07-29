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

const Boom = require('@hapi/boom')

const production = process.env.NODE_ENV === 'production'
// Defaults to `fs` in production.
const persistence = process.env.GI_PERSIST || (production ? 'fs' : undefined)

// Default database options. Other values may be used e.g. in tests.
const options = {
  fs: {
    dirname: './data'
  },
  sqlite: {
    dirname: './data',
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

sbp('sbp/selectors/register', {
  'backend/db/streamEntriesAfter': async function (contractID: string, hash: string): Promise<*> {
    let { HEAD: currentHEAD } = await sbp('chelonia/db/latestHEADinfo', contractID)
    if (!currentHEAD) {
      throw Boom.notFound(`contractID ${contractID} doesn't exist!`)
    }
    let prefix = '['
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read (): any {
        try {
          const entry = await sbp('chelonia/db/getEntry', currentHEAD)
          const json = `"${strToB64(entry.serialize())}"`
          if (currentHEAD !== hash) {
            this.push(prefix + json)
            currentHEAD = entry.head().previousHEAD
            prefix = ','
          } else {
            this.push(prefix + json + ']')
            this.push(null)
          }
        } catch (e) {
          console.error(`read(): ${e.message}:`, e)
          this.push(']')
          this.push(null)
        }
      }
    })
  },
  'backend/db/streamEntriesBefore': async function (before: string, limit: number): Promise<*> {
    let prefix = '['
    let currentHEAD = before
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw Boom.notFound(`entry ${currentHEAD} doesn't exist!`)
    }
    limit++ // to return `before` apart from the `limit` number of events
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read (): any {
        try {
          if (!currentHEAD || !limit) {
            this.push(']')
            this.push(null)
          } else {
            entry = await sbp('chelonia/db/getEntry', currentHEAD)
            const json = `"${strToB64(entry.serialize())}"`
            this.push(prefix + json)
            prefix = ','
            limit--
            currentHEAD = entry.head().previousHEAD
          }
        } catch (e) {
          // TODO: properly return an error to caller, see https://nodejs.org/api/stream.html#errors-while-reading
          console.error(`read(): ${e.message}:`, e)
          this.push(']')
          this.push(null)
        }
      }
    })
  },
  'backend/db/streamEntriesBetween': async function (startHash: string, endHash: string, offset: number): Promise<*> {
    let prefix = '['
    let isMet = false
    let currentHEAD = endHash
    let entry = await sbp('chelonia/db/getEntry', currentHEAD)
    if (!entry) {
      throw Boom.notFound(`entry ${currentHEAD} doesn't exist!`)
    }
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read (): any {
        try {
          entry = await sbp('chelonia/db/getEntry', currentHEAD)
          const json = `"${strToB64(entry.serialize())}"`
          this.push(prefix + json)
          prefix = ','

          if (currentHEAD === startHash) {
            isMet = true
          } else if (isMet) {
            offset--
          }

          currentHEAD = entry.head().previousHEAD
          if (!currentHEAD || (isMet && !offset)) {
            this.push(']')
            this.push(null)
          }
        } catch (e) {
          // TODO: properly return an error to caller, see https://nodejs.org/api/stream.html#errors-while-reading
          console.error(`read(): ${e.message}:`, e)
          this.push(']')
          this.push(null)
        }
      }
    })
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
    await sbp('chelonia/db/set', namespaceKey(name), value)
    return { name, value }
  },
  'backend/db/lookupName': async function (name: string): Promise<string | Error> {
    const value = await sbp('chelonia/db/get', namespaceKey(name))
    return value || Boom.notFound()
  }
})

function namespaceKey (name: string): string {
  return 'name=' + name
}

export default async () => {
  // If persistence must be enabled:
  // - load and initialize the selected storage backend
  // - then overwrite 'chelonia/db/get' and '-set' to use it with an LRU cache
  if (persistence) {
    const { initStorage, readData, writeData } = await import(`./database-${persistence}.js`)

    await initStorage(options[persistence])

    // https://github.com/isaacs/node-lru-cache#usage
    const cache = new LRU({
      max: Number(process.env.GI_LRU_NUM_ITEMS) || 10000
    })

    sbp('sbp/selectors/overwrite', {
      'chelonia/db/get': async function (prefixableKey: string): Promise<Buffer | string | void> {
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
      'chelonia/db/set': async function (key: string, value: Buffer | string): Promise<void> {
        checkKey(key)
        await writeData(key, value)
        cache.set(key, value)
      }
    })
    sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
  }
  // TODO: Update this to only run when persistence is disabled when `¢hel deploy` can target SQLite.
  if (persistence !== 'fs' || options.fs.dirname !== './data') {
    const HASH_LENGTH = 50
    // Remember to keep these values up-to-date.
    const CONTRACT_MANIFEST_MAGIC = '{"head":{"manifestVersion"'
    const CONTRACT_SOURCE_MAGIC = '"use strict";'
    // Preload contract source files and contract manifests into Chelonia DB.
    // Note: the data folder may contain other files if the `fs` persistence mode
    // has been used before. We won't load them here; that's the job of `chel migrate`.
    // Note: our target files are currently deployed with unprefixed hashes as file names.
    // We can take advantage of this to recognize them more easily.
    // TODO: Update this code when `¢hel deploy` no longer generates unprefixed keys.
    const keys = (await readdir(dataFolder))
      // Skip some irrelevant files.
      .filter(k => k.length === HASH_LENGTH)
    const numKeys = keys.length
    let numVisitedKeys = 0
    let numNewKeys = 0

    console.log('[chelonia.db] Preloading...')
    for (const key of keys) {
      // Skip keys which are already in the DB.
      if (!persistence || !await sbp('chelonia/db/get', key)) {
        const value = await readFile(path.join(dataFolder, key), 'utf8')
        // Load only contract source files and contract manifests.
        if (value.startsWith(CONTRACT_MANIFEST_MAGIC) || value.startsWith(CONTRACT_SOURCE_MAGIC)) {
          await sbp('chelonia/db/set', key, value)
          numNewKeys++
        }
      }
      numVisitedKeys++
      if (numVisitedKeys % Math.floor(numKeys / 10) === 0) {
        console.log(`[chelonia.db] Preloading... ${numVisitedKeys / Math.floor(numKeys / 10)}0% done`)
      }
    }
    numNewKeys && console.log(`[chelonia.db] Preloaded ${numNewKeys} new entries`)
  }
}
