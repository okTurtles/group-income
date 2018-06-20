'use strict'

import * as db from './database.js'
import Hapi from 'hapi'
import GiAuth from './auth.js'
import {GIMessage} from '../shared/events.js'
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

hapi.decorate('server', 'handleEntry', function (entry: GIMessage) {
  console.log(bold('[server] handleEntry:'), entry)
  const contractID = entry.isFirstMessage() ? entry.data.contractID : entry.hash()
  db.addLogEntry(entry)
  var response = entry.toResponse()
  console.log(bold.blue(`broadcasting to room ${contractID}:`), response)
  // TODO: see if this all can be moved into routes.js
  hapi.primus.room(contractID).write(response)
})

// https://hapijs.com/tutorials/plugins
export const loaded = hapi.register(GiAuth).then(() => {
  require('./routes')(hapi)
  require('./pubsub')(hapi)
  return hapi.start().then(() => {
    console.log('API server running at:', hapi.info.uri)
  })
})
