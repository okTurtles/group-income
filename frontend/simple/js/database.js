'use strict'

import localforage from 'localforage'
import {HashableEntry, Events} from '../../../shared/events'

const _logs = new Map()
function groupLog (storeName: string): Object {
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
  groupId: string, hash: string
): Promise<HashableEntry> {
  var {type, proto} = await groupLog(groupId).getItem(hash)
  return Events[type].fromProtobuf(proto, hash)
}

export function recentHash (groupId: string): Promise<string> {
  return groupLog(groupId).getItem('HEAD')
}

export async function addLogEntry (
  groupId: string, event: HashableEntry
) {
  let hash = event.toHash()
  let log = groupLog(groupId)
  let last = await log.getItem('HEAD')
  let exists = await log.getItem(hash)
  let entry = event.toObject()
  if (exists) {
    return console.log('addLogEntry: disregarding already existing entry:', entry)
  }
  if (entry.type === Events.Group.name) {
    if (entry.previousHash) {
      throw new Error('group creation entry with non-null previousHash!')
    }
  } else if (last !== entry.parentHash) {
    console.error(`addLogEntry: new entry has bad parentHash: ${entry.parentHash}. Should be: ${last}. Entry:`, entry)
    throw new Error('incorrect previousHash for entry!')
  }
  await log.setItem('HEAD', hash)
  await log.setItem(hash, {type: entry.type, proto: event.toProtobuf()})
  return hash
}
// collect returns a collection of events
export async function collect (
  groupId: string, from: string
): Promise<Array<HashableEntry>> {
  let collection = []
  let cursor = from
  while (cursor) {
    let entry = await getLogEntry(groupId, cursor)
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
export function saveSettings (state: Object): Promise<*> {
  return appSettings.setItem('testUser', state)
}

export function loadSettings (): Promise<Object> {
  return appSettings.getItem('testUser')
}

// const saveSettings = _.debounce(() => {
//  appSettings.setItem('testUser', state),
//  500, {maxWait: 5000}
// })
