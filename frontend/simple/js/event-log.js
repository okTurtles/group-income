import localforage from 'localforage'
import {toHash, makeEntry, makeEvent, makeLog} from '../../../shared/functions'
import request from 'superagent'
import {EVENTS} from '../../../shared/events'
import {Log, Group} from '../../../shared/types'
const {CREATION} = EVENTS
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
  async getItemFromLog (log: Log, hash: string) {
    let db = getDB(log.groupId)
    let entry = await db.getItem(hash)
    return entry
  },
  // addItemToLog appends to the log
  // returns the current state of the log
  async addItemToLog (log: Log, value: any, update ? : boolean) : Log {
    let db = getDB(log.groupId)
    let currentLogPosition = await db.getItem('currentLogPosition')
    let entry = makeEntry(value, currentLogPosition)
    let hash = toHash(entry)
    // Do not post to server if it is an update from server
    if (!update) {
      await request.post(`${process.env.API_URL}/event/${log.groupId}`)
        .send({ hash, entry })
    }
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    log.currentLogPosition = hash
    return log
  },
  // collect returns a collection of events
  async collect (log: Log) {
    let db = getDB(log.groupId)
    let collection = []
    let cursor = log.currentLogPosition
    while (cursor) {
      let entry = await db.getItem(cursor)
      collection.unshift(entry)
      cursor = entry.parentHash
    }
    return collection
  },
  // Create an Event log based upon arguments
  // a string of the groupid will retrieve the log
  async createEventLogFromGroup (group: Group) : Log {
    let event = makeEvent(CREATION, group)
    let entry = makeEntry(event)
    let hash = toHash(entry)
    await request.post(`${process.env.API_URL}/group`)
      .send({ hash, entry })
    let db = getDB(hash)
    await db.setItem(hash, entry)
    await db.setItem('currentLogPosition', hash)
    let log = makeLog(hash, hash)
    return log
  },
  // Retrieve an Event log based upon arguments
  // a string of the groupid will retrieve the log
  async getEventLogForGroupId (groupId: string) : Log {
    let db = getDB(groupId)
    let groupEntry = await db.getItem(groupId)
    if (!groupEntry) {
      throw new TypeError('Invalid Group')
    }
    let currentLogPosition = await db.getItem('currentLogPosition')
    if (!currentLogPosition) {
      throw new TypeError('Invalid Group')
    }
    let log = makeLog(groupId, currentLogPosition)
    return log
  }
}
