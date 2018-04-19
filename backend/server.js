'use strict'

import * as db from './database'
import Hapi from 'hapi'
import GiAuth from './auth'
import typeof {HashableEntry} from '../shared/events'
import {bold} from 'chalk'

export var hapi = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  //       https://github.com/okTurtles/group-income-simple/issues/32
  debug: { request: ['error'], log: ['error'] }
})

hapi.connection({
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: { cors: { origin: [process.env.FRONTEND_URL] } }
})

hapi.decorate('server', 'handleEvent', async function (
  contractId: string, entry: HashableEntry
) {
  console.log(bold('[server] handleEvent:'), entry)
  if (!entry.toObject().parentHash) {
    await db.createLog(contractId, entry)
  } else {
    await db.appendLogEntry(contractId, entry)
  }
  var response = entry.toResponse(contractId)
  console.log(bold.blue(`broadcasting to room ${contractId}:`), response)
  hapi.primus.room(contractId).write(response)
})

// https://hapijs.com/tutorials/plugins
export const loaded = hapi.register(GiAuth).then(() => {
  require('./routes')(hapi)
  require('./pubsub')(hapi)
  return hapi.start().then(() => {
    console.log('API server running at:', hapi.info.uri)
  })
})
