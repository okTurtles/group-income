import {default as idbLog, attachVuex} from './idb-flume-log'
import filter from './flumeview-filter'
import flumeDB from 'flumedb'
var log
var db
export const loaded = idbLog().then((value) => { log = value })
export const attachStore = attachVuex

export default function EventLog () {
  if (!db) {
    db = flumeDB(log)
    db.use('payment', filter((event) => {
      return event.value.type === 'Payment'
    }))
    return db
  } else {
    return db
  }
}
