'use strict'

// import fs from 'fs'
import {Readable} from 'stream'
import {GIMessage} from '../shared/events.js'
import sbp from '../shared/sbp.js'
import '../shared/domains/okTurtles/data'

// TODO: use some fast key/value store
// delete the test database if it exists
// const production = process.env.NODE_ENV === 'production'
// !production && fs.existsSync('test.db') && fs.unlinkSync('test.db')

const logHEAD = contractID => `${contractID}/HEAD`
const get = key => sbp('okTurtles.data/get', key)
const set = (key, value) => sbp('okTurtles.data/set', key, value)

export function addLogEntry (entry: GIMessage): string {
  console.log('addLogEntry():', entry.hash(), entry.data)
  const {previousHEAD} = entry.data
  var contractID = previousHEAD ? entry.data.contractID : entry.hash()
  if (get(entry.hash())) {
    throw new Error(`entry exists: ${entry.hash()}`)
  }
  const HEAD = get(logHEAD(contractID))
  if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
    console.error(`bad previousHEAD: ${previousHEAD}! Expected: ${HEAD}`)
    throw new Error(`bad previousHEAD: ${previousHEAD}`)
  }
  set(logHEAD(contractID), entry.hash())
  set(entry.hash(), entry.serialize())
  return entry.hash()
}

export function getLogEntry (hash: string): GIMessage {
  return GIMessage.deserialize(get(hash))
}

export function lastEntry (contractID: string): GIMessage {
  return getLogEntry(get(logHEAD(contractID)))
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
      const json = entry.serialize()
      if (currentHEAD !== hash) {
        this.push(prefix + json)
        currentHEAD = entry.data.previousHEAD
        prefix = ','
      } else {
        this.push(json + ']')
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

export async function lookupName (name: string) {
  return get(`namespace/${name}`)
}
