'use strict'

import localforage from 'localforage'
import {toHash} from '../../../shared/functions'
import {ENTRY_TYPE} from '../../../shared/constants'
import type {Entry} from '../../../shared/types'

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
export function getLogEntry (groupId: string, hash: string): Promise<Entry> {
  return groupLog(groupId).getItem(hash)
}

export function recentHash (groupId: string): Promise<string> {
  return groupLog(groupId).getItem('HEAD')
}

export async function addLogEntry (groupId: string, hash: string, entry: Entry) {
  let expected = toHash(entry)
  if (hash !== expected) throw new Error(`hash mismatch: ${hash} != ${expected}`)
  let log = groupLog(groupId)
  let last = await log.getItem('HEAD')
  let exists = await log.getItem(hash)
  if (exists) {
    return console.log('addLogEntry: disregarding already existing entry:', entry)
  }
  if (entry.type === ENTRY_TYPE.CREATION) {
    if (entry.previousHash) {
      throw new Error('group creation entry with non-null previousHash!')
    }
  } else if (last !== entry.parentHash) {
    console.error(`addLogEntry: new entry has bad parentHash: ${entry.parentHash}. Should be: ${last}. Entry:`, entry)
    throw new Error('incorrect previousHash for entry!')
  }
  await log.setItem('HEAD', hash)
  await log.setItem(hash, entry)
  return hash
}
// collect returns a collection of events
export async function collect (
  groupId: string, from: string
): Promise<Array<Entry>> {
  let log = groupLog(groupId)
  let collection = []
  let cursor = from
  while (cursor) {
    let entry = await log.getItem(cursor)
    collection.unshift(entry)
    cursor = entry.parentHash
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
