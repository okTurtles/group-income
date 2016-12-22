import {default as idbLog, attachVuex} from '../js/idb-flume-log'

import flumeDB from 'flumedb'
var log
var db
export const loaded = idbLog().then((value) => { log = value })
export const attachStore = attachVuex

export default function EventLog () {
  if (!db) {
    db = flumeDB(log)
    return db
  } else {
    return db
  }
}
