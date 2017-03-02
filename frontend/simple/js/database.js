'use strict'

import localforage from 'localforage'
import * as Events from '../../../shared/events'

const {HashableEntry} = Events

const _logs = new Map()
function getLog (storeName: string): Object {
  if (!_logs.has(storeName)) {
    _logs.set(storeName, localforage.createInstance({name: 'GILog', storeName}))
  }
  return _logs.get(storeName) || {} // to make flow stop complaining
}

// These functions should only interact with `db`!
// They SHOULD NOT:
// - Commit changes to the Vuex state (that's done in state.js)
// - Call out to asynchronous APIs via superagent
// They SHOULD:
// - Mirror what's in backend/database.js
export async function getLogEntry (
  contractId: string, hash: string
): Promise<HashableEntry> {
  var entry = await getLog(contractId).getItem(hash)
  return Events[entry.type].fromObject(entry, hash)
}

export function recentHash (contractId: string): Promise<string> {
  return getLog(contractId).getItem('HEAD')
}

export async function addLogEntry (
  contractId: string, event: HashableEntry
) {
  let hash = event.toHash()
  let log = getLog(contractId)
  let last = await log.getItem('HEAD')
  let exists = await log.getItem(hash)
  let entry = event.toObject()
  if (exists) {
    return console.log('addLogEntry: disregarding already existing entry:', entry)
  }
  if (entry.parentHash && last !== entry.parentHash) {
    console.error(`addLogEntry: new entry has bad parentHash: ${entry.parentHash}. Should be: ${last}. Entry:`, entry)
    throw new Error('incorrect previousHash for entry!')
  }
  // save object instead of protobuf because it takes less space (see #172)
  await log.setItem('HEAD', hash)
  await log.setItem(hash, entry)
  return hash
}
// collect returns a collection of events
export async function collect (
  contractId: string, from: string
): Promise<Array<HashableEntry>> {
  let collection = []
  let cursor = from
  while (cursor) {
    let entry = await getLogEntry(contractId, cursor)
    collection.unshift(entry)
    cursor = entry.toObject().parentHash
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
export function saveCurrentUser (user: string): Promise<Object> {
  return appSettings.setItem('currentUser', user)
}
export function clearCurrentUser (): Promise<Object> {
  return appSettings.setItem('currentUser', null)
}
export function loadCurrentUser (): Promise<Object> {
  return appSettings.getItem('currentUser')
}
