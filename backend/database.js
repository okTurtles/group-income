'use strict'

import sbp from '@sbp/sbp'
import { strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import util from 'util'
import path from 'path'
import '@sbp/okturtles.data'
import '~/shared/domains/chelonia/db.js'

const Boom = require('@hapi/boom')

const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const dataFolder = path.resolve('./data')

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

const production = process.env.NODE_ENV === 'production'

export default (sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string, offset: number): Promise<*> {
    let currentHEAD = await sbp('chelonia/db/latestHash', contractID)
    if (!currentHEAD) {
      throw Boom.notFound(`contractID ${contractID} doesn't exist!`)
    }
    let isMet = false
    let prefix = '['
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read (): any {
        try {
          const entry = await sbp('chelonia/db/getEntry', currentHEAD)
          const json = `"${strToB64(entry.serialize())}"`

          if (currentHEAD === hash) {
            isMet = true
          } else if (isMet) {
            offset--
          }

          this.push(prefix + json)
          currentHEAD = entry.message().previousHEAD
          prefix = ','

          if (isMet && offset <= 0) {
            this.push(']')
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

if (production || process.env.GI_PERSIST) {
  sbp('sbp/selectors/overwrite', {
    // we cannot simply map this to readFile, because 'chelonia/db/getEntry'
    // calls this and expects a string, not a Buffer
    // 'chelonia/db/get': sbp('sbp/selectors/fn', 'backend/db/readFile'),
    'chelonia/db/get': async function (filename: string) {
      const value = await sbp('backend/db/readFile', filename)
      return Boom.isBoom(value) ? null : value.toString('utf8')
    },
    'chelonia/db/set': sbp('sbp/selectors/fn', 'backend/db/writeFile')
  })
  sbp('sbp/selectors/lock', ['chelonia/db/get', 'chelonia/db/set', 'chelonia/db/delete'])
}
