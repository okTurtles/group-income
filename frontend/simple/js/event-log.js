import localforage from 'localforage'
import {toHash, makeEntry, makeEvent} from '../../../shared/functions'
import request from 'superagent'
import {EVENTS} from '../../../shared/events'
import {Group} from '../../../shared/types'
import userSession from './user-session'
const {CREATION} = EVENTS
var store
// =======================
// Helpers
// =======================
let _db = new Map()
function getDB (hash: string) {
  if (_db.has(hash)) {
    return _db.get(hash)
  }
  let db = localforage.createInstance({
    name: 'Group Income',
    storeName: hash
  })
  _db.set(hash, db)
  return db
}
// =======================
// Exports
// =======================
// getItemFromLog retrieves from the log
// opts object allows for parent hash to be returned instead of data
export default {
  async getItemFromLog (hash: string) {
    if (!store.state.loggedInUser) {
      return
    }
    let groupId = await userSession.getCurrentGroup(store.state.loggedInUser)
    let db = getDB(groupId)
    let entry = await db.getItem(hash)
    return entry
  },
  // addItemToLog appends to the log
  // returns the current state of the log
  async addItemToLog (value: any): string {
    if (!store.state.loggedInUser) {
      return
    }
    let groupId = await userSession.getCurrentGroup(store.state.loggedInUser)
    let db = getDB(groupId)
    let currentLogPosition = await db.getItem('currentLogPosition')
    let entry = makeEntry(value, currentLogPosition)
    let hash = toHash(entry)
    await request.post(`${process.env.API_URL}/event/${groupId}`)
        .send({ hash, entry })
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    return hash
  },
  // updateLogFromServer updates a log from a server event
  // returns the current state of the log
  async updateLogFromServer (groupId: string, value: any): string {
    if (!store.state.loggedInUser) {
      return
    }
    let db = getDB(groupId)
    let currentLogPosition = await db.getItem('currentLogPosition')
    // TODO Figure out what to do when two windows are open in the same browser
    let entry = makeEntry(value, currentLogPosition)
    let hash = toHash(entry)
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    return hash
  },
  // collect returns a collection of events
  async collect () {
    if (!store.state.loggedInUser) {
      return []
    }
    let groupId = await userSession.getCurrentGroup(store.state.loggedInUser)
    let db = getDB(groupId)
    let collection = []
    let cursor = store.state.currentLogPosition
    while (cursor) {
      let entry = await db.getItem(cursor)
      collection.unshift(entry)
      cursor = entry.parentHash
    }
    return collection
  },
  // Create an Event log based upon arguments
  // a string of the groupid will retrieve the log
  async createEventLogFromGroup (group: Group): string {
    let event = makeEvent(CREATION, group)
    let entry = makeEntry(event)
    let hash = toHash(entry)
    await request.post(`${process.env.API_URL}/group`)
      .send({ hash, entry })
    let db = getDB(hash)
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    await userSession.addAvailableGroup(store.state.loggedInUser, hash)
    await userSession.setCurrentGroup(store.state.loggedInUser, hash)
    return hash
  },
  // Retrieve an Event log based upon arguments
  // a string of the groupid will retrieve the log
  async getCurrentLogPositionForGroup (groupId: string): string {
    let db = getDB(groupId)
    let groupEntry = await db.getItem(groupId)
    if (!groupEntry) {
      throw new TypeError('Invalid Group')
    }
    let currentLogPosition = await db.getItem('currentLogPosition')
    if (!currentLogPosition) {
      throw new TypeError('Invalid Group')
    }
    return currentLogPosition
  }
}
export function attachVuex (vuex) {
  store = vuex
}
