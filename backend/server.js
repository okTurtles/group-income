'use strict'

import * as db from './database'
import Hapi from 'hapi'
import GiAuth from './auth'
import {RESPONSE_TYPE, ENTRY_TYPE} from '../shared/constants'
import {makeResponse} from '../shared/functions'
import type {Entry} from '../shared/types'
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
  groupId: string, hash: string, entry: Entry
) {
  console.log(bold('[server] handleEvent:'), entry)
  if (entry.type === ENTRY_TYPE.CREATION) {
    await db.createGroup(groupId, entry)
  } else {
    await db.appendLogEntry(groupId, hash, entry)
  }
  var response = makeResponse(RESPONSE_TYPE.ENTRY, {groupId, hash, entry})
  console.log(bold.blue(`broadcasting to room ${groupId}:`), response)
  hapi.primus.room(groupId).write(response)
})

// https://hapijs.com/tutorials/plugins
export const loaded = hapi.register(GiAuth).then(() => {
  require('./routes')(hapi)
  require('./pubsub')(hapi)
  return hapi.start().then(() => {
    console.log('API server running at:', hapi.info.uri)
  })
})
