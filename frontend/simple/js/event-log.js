'use strict'

import localforage from 'localforage'
import {toHash} from '../../../shared/functions'

import type {Entry} from '../../../shared/types'

const _db = new Map()
function logDB (storeName: string) {
  if (!_db.has(storeName)) {
    _db.set(storeName, localforage.createInstance({name: 'GIGroup', storeName}))
  }
  return _db.get(storeName)
}

// These functions should only interact with `db`!
// They SHOULD NOT:
// - Commit changes to the Vuex state (that's done in state.js)
// - Call out to asynchronous APIs via superagent
// They SHOULD:
// - Mirror what's in backend/database.js
export default {
  getLogEntry (groupId: string, hash: string): Promise {
    return logDB(groupId).getItem(hash)
  },
  async addLogEntry (groupId: string, hash: string, entry: Entry) {
    let expected = toHash(entry)
    if (hash !== expected) throw new Error(`hash mismatch: ${hash} != ${expected}`)
    // TODO: like appendLogEntry in database.js, this should also error check previousHash
    let db = logDB(groupId)
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    return hash
  },
  // collect returns a collection of events
  async collect (groupId: string, from: string): Array {
    let db = logDB(groupId)
    let collection = []
    let cursor = from
    while (cursor) {
      let entry = await db.getItem(cursor)
      collection.unshift(entry)
      cursor = entry.parentHash
    }
    return collection
  }
}
