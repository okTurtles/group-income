'use strict'

import * as db from './database.js'
import Hapi from 'hapi'
import GiAuth from './auth.js'
import { GIMessage } from '../shared/GIMessage.js'
import { makeResponse } from '../shared/functions.js'
import { RESPONSE_TYPE } from '../shared/constants.js'
import { bold } from 'chalk'

// NOTE: migration guides for Hapi v16 -> v17:
//       https://github.com/hapijs/hapi/issues/3658
//       https://medium.com/yld-engineering-blog/so-youre-thinking-about-updating-your-hapi-js-server-to-v17-b5732ab5bdb8
//       https://futurestud.io/tutorials/hapi-v17-upgrade-guide-your-move-to-async-await

export var hapi = Hapi.server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  //       https://github.com/okTurtles/group-income-simple/issues/32
  // debug: false, // <- Hapi v16 was outputing too many unnecessary debug statements
  //               // v17 doesn't seem to do this anymore so I've re-enabled the logging
  debug: { log: ['error'], request: ['error'] },
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
  require('./routes.js').default(hapi)
  require('./pubsub.js').default(hapi)
  return hapi.start().then(() => {
    console.log('API server running at:', hapi.info.uri)
  })
})
