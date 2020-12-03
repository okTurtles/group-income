'use strict'

import sbp from '~/shared/sbp.js'
import { strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import util from 'util'
import path from 'path'
import '~/shared/domains/okTurtles/data.js'
import '~/shared/domains/gi/db.js'

const Boom = require('@hapi/boom')

const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const dataFolder = path.resolve('./data')

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

const production = process.env.NODE_ENV === 'production'

export default sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string) {
    let currentHEAD = await sbp('gi.db/get', sbp('gi.db/log/logHEAD', contractID))
    if (!currentHEAD) {
      throw Boom.notFound(`contractID ${contractID} doesn't exist!`)
    }
    let prefix = '['
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read () {
        try {
          const entry = await sbp('gi.db/log/getEntry', currentHEAD)
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
  // =======================
  // wrapper methods to add / lookup names
  // =======================
  'backend/db/registerName': async function (name: string, value: string): Promise {
    const exists = await sbp('backend/db/lookupName', name)
    if (exists) {
      if (!Boom.isBoom(exists)) {
        return Boom.conflict('exists')
      } else if (exists.output.statusCode !== 404) {
        throw exists // throw if this is an error other than "not found"
      }
      // otherwise it is a Boom.notFound(), proceed ahead
    }
    await sbp('gi.db/set', namespaceKey(name), value)
    return { name, value }
  },
  'backend/db/lookupName': async function (name: string): Promise {
    const value = await sbp('gi.db/get', namespaceKey(name))
    return value || Boom.notFound()
  },
  // =======================
  // Filesystem API
  //
  // TODO: add encryption
  // =======================
  'backend/db/readFile': async function (filename: string): Promise {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (!fs.existsSync(filepath)) {
      return Boom.notFound()
    }
    return await readFileAsync(filepath)
  },
  'backend/db/writeFile': async function (filename: string, data: any): Promise {
    // TODO: check for how much space we have, and have a server setting
    //       that determines how much of the disk space we're allowed to
    //       use. If the size of the file would cause us to exceed this
    //       amount, throw an exception
    return await writeFileAsync(throwIfFileOutsideDataDir(filename), data)
  },
  'backend/db/writeFileOnce': async function (filename: string, data: any): Promise {
    const filepath = throwIfFileOutsideDataDir(filename)
    if (fs.existsSync(filepath)) {
      console.warn('writeFileOnce: exists:', filepath)
      return
    }
    return await writeFileAsync(filepath, data)
  }
})

function namespaceKey (name: string): string {
  return 'user=' + name
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
    // we cannot simply map this to readFile, because 'gi.db/log/getEntry'
    // calls this and expects a string, not a Buffer
    // 'gi.db/get': sbp('sbp/selectors/fn', 'backend/db/readFile'),
    'gi.db/get': async function (filename: string) {
      const value = await sbp('backend/db/readFile', filename)
      return Boom.isBoom(value) ? null : value.toString('utf8')
    },
    'gi.db/set': sbp('sbp/selectors/fn', 'backend/db/writeFile')
  })
}
