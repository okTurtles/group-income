'use strict'

import sbp from '~/shared/sbp.js'
import { GIMessage } from '~/shared/GIMessage.js'
import { strToB64 } from '~/shared/functions.js'
import { Readable } from 'stream'
import fs from 'fs'
import util from 'util'

const writeFileAsync = util.promisify(fs.writeFile)
const readFileAsync = util.promisify(fs.readFile)
const dataFolder = './data'

// TODO: use some fast key/value store
// TODO: just use the file system! store the json of each message to disk as a file with its hash as the file name

if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder, { mode: 0o750 })
}

// delete the test database if it exists
// const production = process.env.NODE_ENV === 'production'
// !production && fs.existsSync('test.db') && fs.unlinkSync('test.db')

const logHEAD = (contractID: string) => `${contractID}/HEAD`
const get = (key: string) => sbp('okTurtles.data/get', key)
const set = (key: string, value: string) => sbp('okTurtles.data/set', key, value)

export function addLogEntry (entry: GIMessage): string {
  const { previousHEAD } = entry.message()
  var contractID: string = previousHEAD ? entry.message().contractID : entry.hash()
  if (get(entry.hash())) {
    console.warn(`entry exists: ${entry.hash()}`)
    return entry.hash()
  }
  const HEAD = get(logHEAD(contractID))
  if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
    console.error(`[server] bad previousHEAD: ${previousHEAD}! Expected: ${HEAD} for contractID: ${contractID}`)
    throw new Error(`bad previousHEAD: ${previousHEAD}`)
  }
  set(logHEAD(contractID), entry.hash())
  console.log(`[server] HEAD for ${contractID} updated to:`, entry.hash())
  set(entry.hash(), entry.serialize())
  return entry.hash()
}

export function getLogEntry (hash: string): GIMessage {
  const value = get(hash)
  if (!value) throw new Error(`no entry for ${hash}!`)
  return GIMessage.deserialize(value)
}

export function lastEntry (contractID: string): GIMessage {
  const hash = get(logHEAD(contractID))
  if (!hash) throw new Error(`contract ${contractID} hash no latest hash!`)
  return getLogEntry(hash)
}

// "On an HTTP server, make sure to manually close your streams if a request is aborted."
// From: http://knexjs.org/#Interfaces-Streams
// https://github.com/tgriesser/knex/wiki/Manually-Closing-Streams
// => request.on('close', stream.end.bind(stream))
// NOTE: On Hapi.js the event is 'disconnect'.
export function streamEntriesSince (contractID: string, hash: string) {
  var currentHEAD = get(logHEAD(contractID))
  var prefix = '['
  return new Readable({
    read () {
      const entry = getLogEntry(currentHEAD)
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
}

// =======================
// wrapper methods to add / lookup names
// =======================

export function registerName (name: string, value: string) {
  if (get(`namespace/${name}`)) throw new Error(`exists: ${name}`)
  set(`namespace/${name}`, value)
}

export function lookupName (name: string) {
  return get(`namespace/${name}`)
}

// =======================
// Filesystem API
//
// TODO: add encryption
// =======================

export function writeFile (filename: string, data: any) {
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

export function readFile (filename: string) {
  return readFileAsync(dataFolder + '/' + filename)
}

// =======================
// Register SBP selectors
// =======================

export default sbp('sbp/selectors/register', {
  'backend/db/addLogEntry': addLogEntry,
  'backend/db/getLogEntry': getLogEntry,
  'backend/db/lastEntry': lastEntry,
  'backend/db/streamEntriesSince': streamEntriesSince,
  'backend/db/registerName': registerName,
  'backend/db/lookupName': lookupName,
  'backend/db/writeFile': writeFile,
  'backend/db/readFile': readFile
})
