import localforage from 'localforage'
import {toHash, makeEntry, makeEvent, makeLog} from '../../../shared/functions'
import request from 'superagent'
import {EVENTS} from '../../../shared/events'
import {Group} from '../../../shared/types'
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
    let groupId = store.state.session.currentGroup.groupId
    let db = getDB(groupId)
    let entry = await db.getItem(hash)
    return entry
  },
  // addItemToLog appends to the log
  // returns the current state of the log
  async addItemToLog (value: any) {
    if (!store.state.loggedInUser) {
      return
    }
    let groupId = store.state.session.currentGroup.groupId
    let db = getDB(groupId)
    let currentLogPosition = await db.getItem('currentLogPosition')
    let entry = makeEntry(value, currentLogPosition)
    let hash = toHash(entry)
    await request.post(`${process.env.API_URL}/event/${groupId}`)
        .send({ hash, entry })
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    store.commit('updateCurrentLogPosition', hash)
  },
  // updateLogFromServer updates a log from a server event
  // returns the current state of the log
  async updateLogFromServer (groupId: string, value: any) {
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
    // update current if the event is for the current group
    if (store.state.session.currentGroup.groupId === groupId) {
      store.commit('updateCurrentLogPosition', currentLogPosition)
    }
  },
  // collect returns a collection of events
  async collect () {
    if (!store.state.loggedInUser) {
      return []
    }
    let groupId = store.state.session.currentGroup.groupId
    let db = getDB(groupId)
    let collection = []
    let cursor = store.state.session.currentGroup.currentLogPosition
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
    store.commit('addAvailableGroup', hash)
    store.commit('setCurrentGroup', makeLog(hash, hash))
    return hash
  }
}
export function attachVuex (vuex) {
  store = vuex
}
