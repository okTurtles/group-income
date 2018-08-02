'use strict'

import localforage from 'localforage'
import {GIMessage} from '../../../shared/GIMessage.js'

const log = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Contracts'
})
const logHEAD = contractID => `${contractID}/HEAD`
const get = key => log.getItem(key)
const set = (key, value) => log.setItem(key, value)

// These functions should only interact with `db`!
// They SHOULD NOT:
// - Commit changes to the Vuex state (that's done in state.js)
// - Call out to asynchronous APIs via superagent
// They SHOULD:
// - Mirror what's in backend/database.js
export async function getLogEntry (hash: string): Promise<GIMessage> {
  return GIMessage.deserialize(await get(hash))
}

export async function addLogEntry (entry: GIMessage): Promise<string> {
  console.log('addLogEntry():', entry.hash(), entry.message())
  const {previousHEAD} = entry.message()
  var contractID = previousHEAD ? entry.message().contractID : entry.hash()
  if (await get(entry.hash())) {
    throw new Error(`entry exists: ${entry.hash()}`)
  }
  const HEAD = await get(logHEAD(contractID))
  if (!entry.isFirstMessage() && previousHEAD !== HEAD) {
    console.error(`bad previousHEAD: ${previousHEAD}! Expected: ${HEAD}`)
    throw new Error(`bad previousHEAD: ${previousHEAD}`)
  }
  await set(logHEAD(contractID), entry.hash())
  await set(entry.hash(), entry.serialize())
  return entry.hash()
}
// collect returns a collection of events
export async function collect (contractID: string, hash: string): Promise<Array<GIMessage>> {
  let collection = []
  let cursor = hash
  while (true) {
    let entry = await getLogEntry(cursor)
    collection.unshift(entry)
    if (entry.hash() === hash) break
    cursor = entry.message().previousHEAD
  }
  return collection
}

// =======================
// App settings to persist state across sessions
// =======================

const appSettings = localforage.createInstance({
  name: 'Group Income',
  storeName: 'Settings'
})

// TODO: replace 'testUser' with something real based on login
export function saveSettings (user: string, state: Object): Promise<*> {
  return appSettings.setItem(user, state)
}

export function loadSettings (user: string): Promise<Object> {
  return appSettings.getItem(user)
}
export function clearUser (user: string): Promise<Object> {
  return appSettings.removeItem(user)
}
export function saveCurrentUser (user: string): Promise<Object> {
  return appSettings.setItem('currentUser', user)
}
export function clearCurrentUser (): Promise<Object> {
  return appSettings.setItem('currentUser', null)
}
export function loadCurrentUser (): Promise<string> {
  return appSettings.getItem('currentUser')
}
