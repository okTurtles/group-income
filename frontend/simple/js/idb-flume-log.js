import localforage from 'localforage'
import { toHash, makeEntry } from '../../../shared/functions'
import Append from 'append-batch'
import Obv from 'obv'
const storeName = 'EventLogStorage'
const name = 'Group Income'

// Generate a log
export default async function log (vuex) {
  // Initialize localforage to Index
  // https://www.html5rocks.com/en/tutorials/offline/quota-research/#toc-overview
  localforage.config({
    driver: localforage.INDEXEDDB,
    name,
    storeName
  })
  /* eslint-disable no-unused-vars */
  let current
  // since is the Observable object
  // https://github.com/dominictarr/obv
  let since = Obv()
  let store = vuex

  // Load current state of the log
  try {
    current = await localforage.getItem('current')
  } catch (ex) {
    current = null
  }
  if (store) {
    store.commit('UPDATELOG', current)
  }
  since.set(current)

  function get (opts, cb) {
    let hash
    if (typeof opts === 'string') {
      hash = opts
    } else {
      hash = opts.hash
    }
    localforage.getItem(hash, (err, entry) => {
      if (err) {
        return cb(err)
      }
      if (opts.parentHash) {
        return cb(null, entry.parentHash)
      } else {
        return cb(null, entry.data)
      }
    })
  }

  let batcher = function (batch, cb) {
    // DB must be canonical source of current log may lose sync with two windows open
    localforage.getItem('current', (err, cur) => {
      if (err) {
        return cb(err)
      }
      current = cur
      let i = -1
      let hash
      let next = (err) => {
        if (err) {
          return cb(err)
        }
        i++
        if (i < batch.length) {
          let value = batch[ i ]
          let entry = makeEntry(value, current)
          hash = toHash(entry)
          localforage.setItem(hash, entry, (err) => {
            if (err) {
              return cb(err)
            }
            current = hash
            localforage.setItem('current', current, next)
          })
        } else {
          since.set(current)
          return cb(null, since.value)
        }
      }
      next()
    })
  }

  let append = Append(batcher)

  // Pull Stream representig how the log is accessed
  // API: https://github.com/pull-stream/pull-stream
  function stream (opts) {
    opts = opts || {}
    // Flumedb api for greater than, greater than equal, less than, less than equal
    let min = opts.gt ? opts.gt : opts.gte ? opts.gte : null
    let max = opts.lt ? opts.lt : opts.lte ? opts.lte : current
    let values = opts.values || true
    let seqs = opts.seqs || false
    // Only Query inside the parameters of VUEX state
    let cursor = store ? store.state.logPosition : current
    let minFound = false
    let maxFound = false

    return function (end, cb) {
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
      // Throw errors if you the minimum or the end of the list before the maximum\
      let yeld = () => {
        if (maxFound && !minFound) {
          if (value) {
            if (seqs) {
              return cb(null, seq)
            } else {
              return cb(null, value)
            }
          } else {
            localforage.getItem(cursor, (err, data) => {
              if (err) {
                return cb(err)
              }
              value = data.data
              if (cursor === min) {
                minFound = true
              }
              seq = cursor
              cursor = data.parentHash

              if (seqs) {
                return cb(null, seq)
              } else {
                return cb(null, value)
              }
            })
          }
        } else {
          return cb(true)
        }
      }
      let next = (err) => {
        if (err) {
          return cb(err)
        }
        if (!maxFound) {
          if (cursor === null) {
            return cb(true)
          }
          localforage.getItem(cursor, (err, data) => {
            if (err) {
              return cb(err)
            }
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
            next()
          })
        } else {
          return yeld()
        }
      }
      next()
    }
  }

  return {
    dir: storeName,
    since: since,
    stream: stream,
    append: append,
    get: get
  }
}
