'use strict'

const Hapi = require('hapi')
const GiAuth = require('./auth')
const Primus = require('primus')

import * as db from './database'

// TODO: http://mph-web.de/realtime-timeline-with-hapi-js-nes-and-rethinkdb/

export var server = new Hapi.Server({
  // TODO: improve logging and base it on process.env.NODE_ENV
  //       https://github.com/okTurtles/group-income-simple/issues/32
  debug: { request: ['error'], log: ['error'] }
})

server.connection({
  port: process.env.API_PORT,
  // See: https://github.com/hapijs/discuss/issues/262#issuecomment-204616831
  routes: { cors: { origin: [process.env.FRONTEND_URL] } }
})

// setup websockets
// primus events: https://github.com/primus/primus#events
// useful plugins:
// https://github.com/swissmanu/primus-responder
// https://github.com/cayasso/primus-rooms
// https://github.com/cayasso/primus-emitter
// https://github.com/latentflip/hapi_primus_sessions
export var primus = new Primus(server.listener, { transformer: 'uws' })

primus.on('connection', function (spark) {
  // spark is the new connection. https://github.com/primus/primus#sparkheaders
  console.log('connection has the following headers', spark.headers)
  console.log('connection was made from', spark.address)
  console.log('connection id', spark.id)

  spark.on('data', function (data) {
    console.log('received data from the client', data)
    if (data.action) {
      switch (data.action) {
        case 'createGroup':
          db.createGroup(data).then(function (groupId) {
            console.log(`spark ${spark.id} created group:`, groupId)
            spark.groupId = groupId
          }).catch(function (err) {
            console.err(`spark ${spark.id} group creation failed.`, err)
            spark.end()
          })
          break
        case 'joinGroup':
          spark.groupId = data.groupId
          break
        case 'addEvent':
          if (!spark.groupId) {
            console.error(`spark ${spark.id} wants to add an event but isn't part of a group!`)
            spark.end()
          } else {
            console.log(`spark ${spark.id} adding event:`, data.event)
            db.appendLogEntry(spark.groupId, data.event).then(function () {
              // TODO: publish to other sparks
            })
          }
          break
      }
    } else {
      console.error(`spark ${spark.id} didn't give us an action! data:`, data)
      spark.end()
    }
  })
})

primus.on('disconnection', function (spark) {
  // the spark that disconnected
  console.log(`spark ${spark.id} disconnected`)
})

// Register plugins. https://hapijs.com/tutorials/plugins
export const loaded = Promise.all([
  server.register(GiAuth),
  server.start()
]).then(() => console.log('API server running at:', server.info.uri))
