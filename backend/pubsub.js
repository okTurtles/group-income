/* globals logger */

'use strict'

// setup websockets
// primus events: https://github.com/primus/primus#events

// import * as db from './database'
import {EVENT_TYPE} from '../shared/constants'
import {makeResponse, setupPrimus} from '../shared/functions'

const {ERROR, SUCCESS} = EVENT_TYPE

module.exports = function (hapi: Object) {
  var primus = setupPrimus(hapi.listener)
  // makes it possible to access primus via: hapi.primus
  hapi.decorate('server', 'primus', primus)

  primus.on('connection', function (spark) {
    // spark is the new connection. https://github.com/primus/primus#sparkheaders
    const {id, address} = spark
    // console.log('connection has the following headers', headers)
    console.log(`[pubsub] ${id} connected from:`, address)

    // https://github.com/swissmanu/primus-responder
    spark.on('request', function (data, done) {
      console.log('[pubsub] received REQUEST from client:', data)
      var {room, action} = data
      var response = makeResponse(SUCCESS, {action, id})
      try {
        switch (action) {
          case 'join':
            spark.join(room, function () {
              console.log(`[pubsub] ACTION: ${action} ROOM: ${room} client: ${id}`)
              spark.room(room).except(id).write(response)
              done(response)
            })
            break
          case 'leave':
            spark.leave(room, () => {
              console.log(`[pubsub] ACTION: ${action} ROOM: ${room} client: ${id}`)
              // TODO: do we notify other clients here as well?
              done(response)
            })
            break
          default:
            console.error(`[pubsub] client ${id} didn't give us a valid action!`, data)
            spark.leaveAll() // remove this person from all the rooms
            // TODO: do we notify other clients here as well?
            done(makeResponse(ERROR, 'invalid action'))
            spark.end()
        }
      } catch (err) {
        done(makeResponse(ERROR, {action: action || null}, err))
        logger(err)
      }
    })

    spark.on('data', function (data) {
      console.log('[pubsub] received DATA from client:', data)
      /* var {room, action} = data
      var response = makeResponse(SUCCESS, {action, id})
      try {
        switch (action) {
          case 'eventsSince':
            spark.rooms().forEach((room) => {
              // TODO: accept an argument (timestamp or entryNum)
              db.streamEntriesSince(room, {entryNum: 0}).pipe(spark)
            })
            break
          default:
            console.error(`client ${id} didn't give us a valid action!`, data)
            spark.leaveAll() // remove this person from all the rooms
            // TODO: do we notify other clients here as well?
            done(makeResponse(ERROR, 'invalid action'))
            spark.end()
        }
      } catch (err) {
        spark.write(makeResponse(ERROR, {action: action || null}, err))
        logger(err)
      } */
    })
  })

  primus.on('disconnection', function (spark) {
    // the spark that disconnected
    console.log(`[pubsub] ${spark.id} disconnected`)
  })
}
