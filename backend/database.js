'use strict'

import sbp from '@sbp/sbp'
import { strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import util from 'util'
import path from 'path'
import '@sbp/okturtles.data'
import '~/shared/domains/chelonia/db.js'
import LRU from 'lru-cache'

const Boom = require('@hapi/boom')

const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const dataFolder = path.resolve('./data')

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

const persistence = process.env.GI_PERSIST
const production = process.env.NODE_ENV === 'production'

export default (sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string): Promise<*> {
    let currentHEAD = await sbp('chelonia/db/latestHash', contractID)
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
            currentHEAD = entry.message().previousHEAD
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
            currentHEAD = entry.message().previousHEAD
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

          currentHEAD = entry.message().previousHEAD
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
  'backend/db/lookupName': async function (name: string): Promise<*> {
    const value = await sbp('chelonia/db/get', namespaceKey(name))
    return value || Boom.notFound()
  },
  // =======================
  // Filesystem API
  //
  // TODO: add encryption
  // =======================
  'backend/db/readFile': async function (filename: string): Promise<*> {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (!fs.existsSync(filepath)) {
      return Boom.notFound()
    }
    return await readFileAsync(filepath)
  },
  'backend/db/writeFile': async function (filename: string, data: any): Promise<*> {
    // TODO: check for how much space we have, and have a server setting
    //       that determines how much of the disk space we're allowed to
    //       use. If the size of the file would cause us to exceed this
    //       amount, throw an exception
    return await writeFileAsync(throwIfFileOutsideDataDir(filename), data)
  },
  'backend/db/writeFileOnce': async function (filename: string, data: any): Promise<*> {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (fs.existsSync(filepath)) {
      console.warn('writeFileOnce: exists:', filepath)
      return
    }
    return await writeFileAsync(filepath, data)
  }
}): any)

if (persistence === 'fs') {
  sbp('sbp/selectors/register', {
    'backend/db/readString': async function (key: string): Promise<string | null> {
      const bufferOrError = await sbp('backend/db/readFile', key)
      if (Boom.isBoom(bufferOrError)) {
        return null
      }
      return bufferOrError.toString('utf8')
    },
    'backend/db/writeString': async function (key: string, value: string): Promise<void> {
      // eslint-disable-next-line no-useless-catch
      try {
        return await sbp('backend/db/writeFile', key, value)
      } catch (err) {
        throw err
      }
    }
  })
} else if (persistence === 'sqlite') {
  sbp('sbp/selectors/register', {
    'backend/db/readString': function (key: string): Promise<string> {
      return new Promise((resolve, reject) => {
        db.get('SELECT value FROM Strings WHERE key = ?', [key], (err, row) => {
          if (err) {
            reject(err)
          } else {
            resolve(row?.value)
          }
        })
      })
    },
    'backend/db/writeString': function (key, value) {
      return new Promise((resolve, reject) => {
        db.run('REPLACE INTO Strings(key, value) VALUES(?, ?)', [key, value], (err) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    }
  })
}

function namespaceKey (name: string): string {
  return 'name=' + name
}

function throwIfFileOutsideDataDir (filename: string): string {
  const filepath = path.resolve(path.join(dataFolder, filename))
  if (filepath.indexOf(dataFolder) !== 0) {
    throw Boom.badRequest(`bad name: ${filename}`)
  }
  return filepath
}

let db: any = null

if (persistence === 'sqlite') {
  const filename = './data/groupincome.db'
  const sqlite3 = require('sqlite3')

  db = new sqlite3.Database(filename, (err) => {
    if (err) {
      return console.error(err.message)
    }
    console.log('Connected to the %s SQlite database.', filename)
  })
  ;(async function () {
    await new Promise((resolve, reject) => {
      db.run('CREATE TABLE IF NOT EXISTS Strings(key TEXT UNIQUE NOT NULL, value TEXT NOT NULL)', [], (err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  })()
}

if (production || process.env.GI_PERSIST) {
  // https://github.com/isaacs/node-lru-cache#usage
  const cache = new LRU({
    max: Number(process.env.GI_LRU_NUM_ITEMS) || 10000
  })

  sbp('sbp/selectors/overwrite', {
    'chelonia/db/get': async function (key: string) {
      const lookupValue = cache.get(key)
      if (lookupValue !== undefined) {
        return lookupValue
      }
      const value = await sbp('backend/db/readString', key)
      cache.set(key, value)
      return value
    },
    'chelonia/db/set': async function (key: string, value: any): Promise<*> {
      // eslint-disable-next-line no-useless-catch
      try {
        const result = await sbp('backend/db/writeString', key, value)
        cache.set(key, value)
        return result
      } catch (err) {
        throw err
      }
    }
  })
  sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
}
