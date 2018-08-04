'use strict'

import * as db from './database.js'
import Hapi from 'hapi'
import GiAuth from './auth.js'
import {GIMessage} from '../shared/GIMessage.js'
import {makeResponse} from '../shared/functions.js'
import {RESPONSE_TYPE} from '../shared/constants.js'
import {bold} from 'chalk'

export var hapi = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  //       https://github.com/okTurtles/group-income-simple/issues/32
  debug: false
})

hapi.connection({
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: { cors: { origin: [process.env.FRONTEND_URL] } }
})

hapi.decorate('server', 'handleEntry', function (entry: GIMessage) {
  console.log(bold('[server] handleEntry:'), entry.hash(), entry)
  const contractID = entry.isFirstMessage() ? entry.hash() : entry.message().contractID
  db.addLogEntry(entry)
  var response = makeResponse(RESPONSE_TYPE.ENTRY, entry.serialize())
  console.log(bold.blue(`broadcasting to room ${contractID}:`), entry.hash(), entry.type())
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
