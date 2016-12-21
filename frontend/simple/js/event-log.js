import idbLog from '../js/idb-flume-log'
import flumeDB from 'flumedb'
var log
var db
export default async function EventLog (store) {
  if (!db) {
    log = await idbLog(store)
    db = flumeDB(log)
    return db
  } else {
    return db
  }
}
