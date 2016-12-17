import localforage from 'localforage'
import { toHash, makeEntry } from '../../../shared/functions'
import Append from 'append-batch'
import Obv from 'obv'
const store = 'EventLogStorage'
const name = 'Group Income'

// Generate a log
export default async function log () {
  // Initialize localforage to Index
  // https://www.html5rocks.com/en/tutorials/offline/quota-research/#toc-overview
  localforage.config({
    driver: localforage.INDEXEDDB,
    name: name,
    storeName: store
  })
  /* eslint-disable no-unused-vars */
  let current
  // since is the Observable object
  // https://github.com/dominictarr/obv
  let since = Obv()

  // Load current state of the log
  try {
    current = await localforage.getItem('current')
  } catch (ex) {
    current = null
  }
  since.set(current)

  function get (hash, cb) {
    return localforage.getItem(hash, cb)
  }

  var append = Append(function (batch, cb) {
    async function store (value) {
      let entry = makeEntry(value, current)
      let hash = toHash(entry)
      try {
        await localforage.setItem(hash, entry)
      } catch (ex) {
        return cb(ex)
      }
      current = hash
      try {
        await localforage.setItem(store, current)
      } catch (ex) {
        return cb(ex)
      }
    }

    batch.forEach(store)
    since.set(current)
  })

  // Pull Stream representig how the log is accessed
  // API: https://github.com/pull-stream/pull-stream
  function stream (opts) {
    opts = opts || {}
    // Flumedb api for greater than, greater than equal, less than, less than equal
    let min = opts.gt ? opts.gt : opts.gte ? opts.gte : null
    let max = opts.lt ? opts.lt : opts.lte ? opts.lte : current
    let cursor = current
    let minFound = false
    let maxFound = false

    return async function (end, cb) {
      if (end) {
        return cb(end)
      }
      // Close if log is empty
      if (!current) {
        cb(true)
      }
      let value
      // Loop through the log until you reach the max (or the most recent)
      // Throw errors if you the minimum or the end of the list before the maximum
      while (!maxFound) {
        // We reached the end of the list without finding the max value
        if (cursor === null) {
          return cb(new Error('Max value not present in Log'))
        }
        try {
          value = await get(cursor)
        } catch (ex) {
          // TODO if this does not come back we should attempt to get value from the server before throwing exception
          return cb(ex)
        }
        if (cursor === min) {
          minFound = true
        }
        if (cursor === max) {
          maxFound = true
        }
        if (!maxFound && minFound) {
          return cb(new Error('Min is greater than Max in log depth'))
        }
        cursor = value.parent
      }
      if (maxFound && !minFound) {
        if (value) {
          return cb(null, value.data)
        } else {
          try {
            value = await get(cursor)
          } catch (ex) {
            // TODO if this does not come back we should attempt to get value from the server before throwing exception
            return cb(ex)
          }
          if (cursor === min) {
            minFound = true
          }
          cursor = value.parent

          return cb(null, value.data)
        }
      } else {
        cb(true)
      }
    }
  }

  return {
    dir: store,
    since: since,
    stream: stream,
    append: append
  }
}