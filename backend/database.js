'use strict'

// import fs from 'fs'
import {Readable} from 'stream'
import {GIMessage} from '../shared/events.js'
import sbp from '../shared/sbp.js'
import '../shared/domains/okTurtles/data/index.js'
import {strToB64} from '../shared/functions.js'

// TODO: use some fast key/value store
// delete the test database if it exists
// const production = process.env.NODE_ENV === 'production'
// !production && fs.existsSync('test.db') && fs.unlinkSync('test.db')

const logHEAD = contractID => `${contractID}/HEAD`
const get = key => sbp('okTurtles.data/get', key)
const set = (key, value) => sbp('okTurtles.data/set', key, value)

export function addLogEntry (entry: GIMessage): string {
  const {previousHEAD} = entry.message()
  var contractID = previousHEAD ? entry.message().contractID : entry.hash()
  if (get(entry.hash())) {
    throw new Error(`entry exists: ${entry.hash()}`)
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
  console.log('streamEntriesSince():', contractID, hash)
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
