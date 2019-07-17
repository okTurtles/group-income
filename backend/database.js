'use strict'

import sbp from '~/shared/sbp.js'
import { strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import util from 'util'
import path from 'path'
import '~/shared/domains/okTurtles/data.js'
import '~/shared/domains/gi/log.js'

const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const dataFolder = path.resolve('./data')

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

const production = process.env.NODE_ENV === 'production'
// delete the test database if it exists
// !production && fs.existsSync('test.db') && fs.unlinkSync('test.db')

export default sbp('sbp/selectors/register', {
  'backend/db/streamEntriesSince': async function (contractID: string, hash: string) {
    var currentHEAD = await sbp('gi.log/get', sbp('gi.log/logHEAD', contractID))
    var prefix = '['
    // NOTE: if this ever stops working you can also try Readable.from():
    // https://nodejs.org/api/stream.html#stream_stream_readable_from_iterable_options
    return new Readable({
      async read () {
        const entry = await sbp('gi.log/getLogEntry', currentHEAD)
        const json = `"${strToB64(entry.serialize())}"`
        if (currentHEAD !== hash) {
          this.push(prefix + json)
          currentHEAD = entry.message().previousHEAD
          prefix = ','
        } else {
          this.push(prefix + json + ']')
          this.push(null)
        }
      }
    })
  },
  // =======================
  // wrapper methods to add / lookup names
  // =======================
  'backend/db/registerName': function (name: string, value: string) {
    if (sbp('okTurtles.data/get', `namespace/${name}`)) throw new Error(`exists: ${name}`)
    sbp('okTurtles.data/set', `namespace/${name}`, value)
  },
  'backend/db/lookupName': function (name: string): string {
    return sbp('okTurtles.data/get', `namespace/${name}`)
  },
  // =======================
  // Filesystem API
  //
  // TODO: add encryption
  // =======================
  'backend/db/readFile': function (filename: string): Promise<string> {
    const filepath = path.resolve(dataFolder + path.sep + filename)
    if (filepath.indexOf(dataFolder) !== 0) {
      throw new Error(`readFile: bad filename: ${filename}`)
    }
    return readFileAsync(filepath)
  },
  'backend/db/writeFile': function (filename: string, data: any): Promise {
    // TODO: check for how much space we have, and have a server setting
    //       that determines how much of the disk space we're allowed to
    //       use. If the size of the file would cause us to exceed this
    //       amount, throw an exception
    const filepath = dataFolder + '/' + filename
    if (fs.existsSync(filepath)) {
      console.debug('writeFile: exists:', filepath)
      return Promise.resolve()
    }
    return writeFileAsync(filepath, data)
  }
})

if (production) {
  sbp('sbp/selectors/overwrite', {
    'gi.log/get': sbp('sbp/selectors/fn', 'backend/db/readFile'),
    'gi.log/set': sbp('sbp/selectors/fn', 'backend/db/writeFile')
  })
}
