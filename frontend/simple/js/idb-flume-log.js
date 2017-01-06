import localforage from 'localforage'
import { toHash, makeEntry } from '../../../shared/functions'
import Append from 'append-batch'
import Obv from 'obv'
import Notify from 'pull-notify'
const storeName = 'EventLogStorage'
const name = 'Group Income'
let store
let current = null

export function attachVuex (vuex) {
  store = vuex
  if (current) {
    store.commit('UPDATELOG', current)
  }
}
// Generate a log
export default async function log () {
  // Initialize localforage to Index
  // https://www.html5rocks.com/en/tutorials/offline/quota-research/#toc-overview
  localforage.config({
    name,
    storeName
  })
  setTimeout(() => {
    console.log(`Local Forage has selected the ${localforage.driver()} driver`)
  }, 0)
  // since is the Observable object
  // https://github.com/dominictarr/obv
  let since = Obv()
  let notify = Notify()

  // Load current state of the log
  current = await localforage.getItem('current')
  since.set(current)

  async function get (opts, cb) {
    let hash
    if (typeof opts === 'string') {
      hash = opts
    } else {
      hash = opts.hash
    }
    try {
      let entry = await localforage.getItem(hash)
      if (opts.parentHash) {
        return cb(null, entry.parentHash)
      } else {
        return cb(null, entry.data)
      }
    } catch (ex) {
      return cb(ex)
    }
  }

  let batcher = async function (batch, cb) {
    // DB must be canonical source of current log may lose sync with two windows open at different states
    try {
      let cur = await localforage.getItem('current')
      current = cur
      let hash
      for (let i = 0; i < batch.length; i++) {
        let value = batch[ i ]
        let entry = makeEntry(value, current)
        hash = toHash(entry)
        await localforage.setItem(hash, entry)
        current = hash
        await localforage.setItem('current', current)
        since.set(current)
        notify({seq: hash, value: value})
      }
      return cb(null, since.value)
    } catch (ex) {
      return cb(ex)
    }
  }

  let append = Append(batcher)
  function notifier () {
    return notify.listen()
  }

  // Pull Stream representig how the log is accessed
  // API: https://github.com/pull-stream/pull-stream
  function stream (opts) {
    opts = opts || {}
    // Only Query inside the parameters of VUEX state
    let cursor = store ? store.state.logPosition : current
    // Flumedb api for greater than, greater than equal, less than, less than equal
    let min = opts.gt ? opts.gt : (opts.gte ? opts.gte : null)
    let max = opts.lt ? opts.lt : (opts.lte ? opts.lte : cursor)
    let seqs = opts.seqs || false
    let values = opts.values || false
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
      // close if at the end
      if (cursor === null) {
        return cb(true)
      }
      let value
      let seq
      // Loop through the log until you reach the max (or the most recent)
      // Throw errors if the minimum or the end of the list is before the maximum
      try {
        while (!maxFound) {
          let data = await localforage.getItem(cursor)
          value = data.data
          if (cursor === min) {
            minFound = true
          }
          if (cursor === max) {
            maxFound = true
          }
          if (!maxFound && minFound) {
            return cb(new Error('Min is greater than Max in log depth'))
          }
          seq = cursor
          cursor = data.parentHash
        }
        if (maxFound && !minFound) {
          if (value) {
            if (seqs && values) {
              return cb(null, {seq, value})
            } else if (seqs) {
              return cb(null, seq)
            } else {
              return cb(null, value)
            }
          } else {
            let data = await localforage.getItem(cursor)
            value = data.data
            if (cursor === min) {
              minFound = true
            }
            seq = cursor
            cursor = data.parentHash
            if (seqs && values) {
              return cb(null, {seq, value})
            } else if (seqs) {
              return cb(null, seq)
            } else {
              return cb(null, value)
            }
          }
        } else {
          return cb(true)
        }
      } catch (ex) {
        return cb(ex)
      }
    }
  }

  return {
    dir: storeName,
    since: since,
    stream: stream,
    append: append,
    get: get,
    notifier: notifier,
    store: () => { return store }
  }
}
