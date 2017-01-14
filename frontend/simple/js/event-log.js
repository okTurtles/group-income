import localforage from 'localforage'
import { toHash, makeEntry, makeGroup } from '../../../shared/functions'
import request from 'superagent'

// =======================
// Helpers
// =======================
function getDB (hash) {
  let db = localforage.createInstance({
    name: 'Group Income',
    storeName: hash
  })
  return db
}
function postEvent (groupId, hash, entry) {
  return new Promise(function (resolve, reject) {
    request.post(`${process.env.API_URL}/event/${groupId}`)
      .send({hash, entry})
      .end(function (err, res) {
        if (err) {
          return reject(err)
        }
        return resolve()
      })
  })
}
function postGroup (hash, entry) {
  return new Promise(function (resolve, reject) {
    request.post(`${process.env.API_URL}/group`)
      .send({hash, entry})
      .end(function (err, res) {
        if (err) {
          return reject(err)
        }
        return resolve(res.hash)
      })
  })
}
// =======================
// Exports
// =======================
// get retrieves from the log
// opts object allows for parent hash to be returned instead of data
export async function get (log, opts) {
  let hash
  if (typeof opts === 'string') {
    hash = opts
  } else {
    hash = opts.hash
  }
  let db = getDB(log.groupId)
  let entry = await db.getItem(hash)
  if (opts.parentHash) {
    return entry.parentHash
  } else {
    return entry.data
  }
}
// put appends to the log
// opts allow for local updates only
// returns the current state of the log
export async function put (log, opts) {
  let value
  if (opts.value) {
    value = opts.value
  } else {
    value = opts
  }
  let db = getDB(log.groupId)
  let currentLogPosition = await db.getItem('currentLogPosition')
  let entry = makeEntry(value, currentLogPosition)
  let hash = toHash(entry)
  // Do not post to server if it is an update from server
  if (!opts.update || (typeof opts.update !== 'boolean')) {
    await postEvent(log.groupId, hash, entry)
  }
  await db.setItem(hash, entry)
  await db.setItem('currentLogPosition', hash)
  log.currentLogPosition = hash
  return log
}
// collect returns a collection of events
export async function collect (log) {
  let db = getDB(log.groupId)
  let collection = []
  let cursor = log.currentLogPosition
  while (cursor) {
    let entry = await db.getItem(cursor)
    collection.unshift(entry.data)
    cursor = entry.parentHash
  }
  return collection
}
// Retrieve or create an Event log based upon arguments
// a string of the groupid will retrieve the log
// an object will create a group with the object's properties
export default async function EventLog (group) {
  // object case
  if (typeof group === 'object') {
    let groupData = makeGroup(group.groupName,
      group.sharedValues,
      group.changePercentage,
      group.openMembership,
      group.memberApprovalPercentage,
      group.memberRemovalPercentage,
      group.incomeProvided,
      group.conrtibutionPrivacy,
      group.founder)
    let event = {type: 'Creation', payload: groupData}
    let groupEntry = makeEntry(event)
    let groupHash = toHash(groupEntry)
    await postGroup(groupHash, groupEntry)
    let db = getDB(groupHash)
    await db.setItem(groupHash, groupEntry)
    await db.setItem('currentLogPosition', groupHash)
    let log = {groupId: groupHash, currentLogPosition: groupHash}
    return log
    // string case
  } else if (typeof group === 'string') {
    let db = getDB(group)
    let groupEntry = await db.getItem(group)
    if (!groupEntry) {
      throw new TypeError('Invalid Group')
    }
    let currentLogPosition = await db.getItem('currentLogPosition')
    if (!currentLogPosition) {
      throw new TypeError('Invalid Group')
    }
    let log = {groupId: group, currentLogPosition: currentLogPosition}
    return log
  } else {
    throw new TypeError('Invalid Group')
  }
}
